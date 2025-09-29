// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// import {console} from "forge-std/console.sol";

contract Ratings {
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

    error InvalidScore(uint8 rating);

    error InvalidStake(uint256 stake);

    error RatingIsStillValid(uint64 posted, uint128 stake);

    error InvalidRater(address rater);

    error NoSuchRating(bytes32 uriHash, address rater);

    // STAKE_PER_SECOND is how many wei are needed for a second of duration
    uint64 public constant STAKE_PER_SECOND = 16; // wei
    // MIN_STAKE is the minimum wei to send when submitting a rating
    uint64 public constant MIN_STAKE = STAKE_PER_SECOND * 1 weeks;

    // URI hash -> account -> rating
    // The URI hash is a keccak256 of the full URI
    mapping(bytes32 => mapping(address => Rating)) public ratings;

    // URI hash -> URI
    mapping(bytes32 => string) public uris;

    struct Rating {
        uint8 score;
        uint64 posted;
        uint128 stake;
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
        bytes32 uriHash = keccak256(bytes(uri));

        uint256 rebate = ratings[uriHash][msg.sender].stake;
        bool resubmit = rebate > 0;
        uint64 posted = uint64(block.timestamp);

        if (!uris[uriHash]) {
            uris[uriHash] = uri;
        }

        if (resubmit) {
            // Return previous stake if replacing existing rating
            ratings[uriHash][msg.sender].stake = 0; // prevent re-entrancy
            pay(msg.sender, rebate);
        }

        uint128 stake = uint128(msg.value);

        emit RatingSubmitted(
            uriHash,
            msg.sender,
            score,
            stake,
            posted,
            resubmit
        );

        ratings[uriHash][msg.sender] = Rating({
            score: score,
            posted: posted,
            stake: stake
        });
    }

    // Remove a rating to get its stake.
    // Can always remove your own rating.
    // Can only remove someone else's rating if it has expired.
    function removeRating(string calldata uri, address rater) external {
        if (rater == address(0)) revert InvalidRater(rater);

        bytes32 uriHash = keccak256(bytes(uri));
        Rating storage rating = ratings[uriHash][rater];

        if (rating.stake == 0) revert NoSuchRating(uriHash, rater);

        bool isOwnRating = rater == msg.sender;

        // If rating is stil valid then only the rater can remove it.
        if (
            !isOwnRating &&
            rating.posted + (rating.stake / STAKE_PER_SECOND) > block.timestamp
        ) {
            revert RatingIsStillValid(rating.posted, rating.stake);
        }

        uint256 stake = uint256(rating.stake);
        delete ratings[uriHash][rater]; // prevent re-entrancy
        emit RatingRemoved(uriHash, rater, isOwnRating);
        pay(rater, stake);
    }

    function getRating(
        bytes32 uriHash,
        address rater
    ) external view returns (Rating memory) {
        return ratings[uriHash][rater];
    }

    function getRatingByString(
        string calldata uri,
        address rater
    ) external view returns (Rating memory) {
        bytes32 uriHash = keccak256(bytes(uri));
        return ratings[uriHash][rater];
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
}
