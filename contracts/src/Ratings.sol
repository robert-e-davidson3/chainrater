// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// import {console} from "forge-std/console.sol";

contract Ratings {
    //
    // Events
    //

    event RatingSubmitted(
        bytes32 indexed uri,
        address indexed rater,
        uint8 score,
        uint128 stake,
        uint64 posted,
        bool resubmit
    );

    event RatingRemoved(
        bytes32 indexed uri,
        address indexed rater,
        bool cleanup
    );

    //
    // Errors
    //

    error InvalidScore(uint8 rating);

    error InvalidStake(uint256 stake);

    error RatingIsStillValid(uint64 posted, uint128 stake);

    error InvalidRater(address rater);

    error NoSuchRating(bytes32 uriHash, address rater);

    //
    // Constants
    //

    // STAKE_PER_SECOND is how many wei are needed for a second of duration
    uint64 public constant STAKE_PER_SECOND = 16; // wei
    // MIN_STAKE is the minimum wei to send when submitting a rating
    uint64 public constant MIN_STAKE = STAKE_PER_SECOND * 1 weeks;

    //
    // Storage
    //

    // URI hash -> URI
    mapping(bytes32 => string) public uris;

    // URI hash -> account -> index in ratings array
    // The URI hash is a keccak256 of the full URI
    mapping(bytes32 => mapping(address => uint256)) public ratingIndices;

    // List of ratings
    Rating[] public allRatings;

    struct Rating {
        uint8 score;
        uint64 posted;
        uint128 stake;
        address rater;
        bytes32 uriHash;
    }

    //
    // Methods
    //

    constructor() {
        // Index 0 is a dummy
        allRatings.push(
            Rating({
                score: 0,
                posted: 0,
                stake: 0,
                rater: address(0),
                uriHash: bytes32(0)
            })
        );
    }

    function unhashUris(bytes32[] calldata uriHashes) external view returns (string memory result) {
        for (uint256 i = 0; i < uriHashes.length;) {
            string memory uri = uris[uriHashes[i]];
            if (bytes(uri).length == 0) {
                uri = "<unknown>";
            }
            result = string(abi.encodePacked(result, uri, "\n"));
            unchecked { ++i; }
        }
    }

    // Add a new rating.
    // May overwrite existing rating. You get your stake back in that case.
    function submitRating(string calldata uri, uint8 score) external payable {
        if (!validScore(score)) {
            revert InvalidScore(score);
        }

        if (!validStake(msg.value)) {
            revert InvalidStake(msg.value);
        }

        // Compute the hash of the URI string
        bytes32 uriHash = hashUri(bytes(uri));
        if (bytes(uris[uriHash]).length == 0) {
            uris[uriHash] = uri;
        }

        uint256 ratingIndex = ratingIndices[uriHash][msg.sender];
        bool resubmit = ratingIndex != 0;
        uint128 stake = uint128(msg.value);
        uint64 posted = uint64(block.timestamp);

        emit RatingSubmitted(
            uriHash,
            msg.sender,
            score,
            stake,
            posted,
            resubmit
        );

        // On resubmit, return previous stake.
        if (resubmit) {
            uint128 rebate = allRatings[ratingIndex].stake;
            allRatings[ratingIndex] = Rating({
                score: score,
                posted: posted,
                stake: stake,
                rater: msg.sender,
                uriHash: uriHash
            });

            pay(msg.sender, rebate);
        } else {
            allRatings.push(
                Rating({
                    score: score,
                    posted: posted,
                    stake: stake,
                    rater: msg.sender,
                    uriHash: uriHash
                })
            );
            ratingIndices[uriHash][msg.sender] = allRatings.length - 1;
        }
    }

    // Remove a rating to get its stake.
    // Can always remove your own rating.
    // Can only remove someone else's rating if it has expired.
    function removeRating(string calldata uri, address rater) external {
        if (rater == address(0)) revert InvalidRater(rater);

        bytes32 uriHash = hashUri(bytes(uri));
        uint256 ratingIndex = ratingIndices[uriHash][rater];
        if (ratingIndex == 0) revert NoSuchRating(uriHash, rater);
        Rating storage rating = allRatings[ratingIndex];

        bool isOwnRating = rater == msg.sender;

        // If rating is stil valid then only the rater can remove it.
        if (
            !isOwnRating &&
            rating.posted + (rating.stake / STAKE_PER_SECOND) > block.timestamp
        ) {
            revert RatingIsStillValid(rating.posted, rating.stake);
        }

        uint256 stake = uint256(rating.stake);

        // Remove the rating by swapping it with the last one then popping.
        // (Do this first to prevent re-entrancy.)
        uint256 endIndex = allRatings.length - 1;
        if (endIndex == ratingIndex) {
            allRatings.pop();
        } else {
            allRatings[ratingIndex] = allRatings[endIndex];
            allRatings.pop();
            Rating storage movedRating = allRatings[ratingIndex];
            ratingIndices[movedRating.uriHash][movedRating.rater] = ratingIndex;
        }
        ratingIndices[uriHash][rater] = 0;

        emit RatingRemoved(uriHash, rater, isOwnRating);
        pay(rater, stake);
    }

    function getRating(
        bytes32 uriHash,
        address rater
    ) external view returns (Rating memory) {
        uint256 index = ratingIndices[uriHash][rater];
        return allRatings[index];
    }

    function getRatingByString(
        string calldata uri,
        address rater
    ) external view returns (Rating memory) {
        bytes32 uriHash = hashUri(bytes(uri));
        uint256 index = ratingIndices[uriHash][rater];
        return allRatings[index];
    }

    // Get all ratings with pagination.
    // Offset 0 is the first rating
    // Limit 0 means no limit.
    // Returns the total number of ratings in the contract.
    function getAllRatings(
        uint256 offset,
        uint256 limit
    ) external view returns (Rating[] memory ratings, uint256 total) {
        total = allRatings.length - 1; // exclude dummy
        if (offset >= total) {
            return (new Rating[](0), total);
        }
        if (limit == 0 || offset + limit > total) {
            limit = total - offset;
        }
        ratings = new Rating[](limit);
        // TODO can save gas by skipping allRatings bounds check using assembly
        for (uint256 i = 0; i < limit;) {
            ratings[i] = allRatings[offset + 1 + i]; // skip dummy
            unchecked { ++i; }
        }
    }

    function pay(address recipient, uint256 stake) internal {
        payable(recipient).transfer(stake);
    }

    function validScore(uint8 score) internal pure returns (bool) {
        return score >= 1 && score <= 5;
    }

    function validStake(uint256 stake) internal pure returns (bool) {
        return stake >= MIN_STAKE && stake % STAKE_PER_SECOND == 0;
    }

    // Recommended by Foundry linter for being a tiny bit cheaper.
    function hashUri(bytes memory uri) internal pure returns (bytes32 x) {
        assembly {
            x := keccak256(add(uri, 0x20), mload(uri))
        }
    }
}
