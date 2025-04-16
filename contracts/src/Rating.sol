// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Ratings {
    event RatingSubmitted(
        bytes32 indexed uri,
        address indexed rater,
        uint8 score,
        uint64 stake
    );

    event RatingRemoved(
        bytes32 indexed uri,
        address indexed rater,
        uint8 score,
        uint64 stake
    );

    event RatingCleanedUp(
        bytes32 indexed uri,
        address indexed rater,
        uint8 score,
        uint64 stake
    );

    error InvalidScore(uint8 rating);

    error InvalidStake(uint64 stake);

    error RatingIsStillValid(uint64 posted, uint64 stake);

    error InvalidRater(address rater);

    error NoSuchRating(bytes32 uri, address rater);

    // STAKE_PER_SECOND is how many wei are needed for a second of duration
    // Note that Rating.stake == 16 wei == 1 second
    uint64 public constant STAKE_PER_SECOND = 16; // 16 wei
    // MIN_STAKE is the minimum wei to send when submitting a rating
    uint64 public constant MIN_STAKE = STAKE_PER_SECOND * 1 weeks;

    // URI hash -> account -> rating
    // The URI hash is a keccak256 of the full URI
    mapping(bytes32 => mapping(address => Rating)) public ratings;

    struct Rating {
        uint8 score;
        uint64 posted;
        uint64 stake; // denominated in 16 wei
    }

    // Add a new rating.
    // May overwrite existing rating. You get your stake back in that case.
    function submitRating(bytes32 uri, uint8 score) external payable {
        if (!validScore(score)) {
            revert InvalidScore(score);
        }

        uint64 stake = uint64(msg.value);

        if (!validStake(stake)) {
            revert InvalidStake(stake);
        }

        // Return previous stake if replacing existing rating.
        uint64 rebate = ratings[uri][msg.sender].stake;
        if (rebate > 0) {
            ratings[uri][msg.sender].stake = 0; // prevent re-entrancy
            pay(msg.sender, rebate);
        }

        ratings[uri][msg.sender] = Rating({
            score: score,
            posted: uint64(block.timestamp),
            stake: stake / STAKE_PER_SECOND
        });

        emit RatingSubmitted(uri, msg.sender, score, stake);
    }

    // Remove your own rating, and get your stake back.
    function removeRating(bytes32 uri) external {
        Rating storage rating = ratings[uri][msg.sender];

        if (rating.stake == 0) {
            revert NoSuchRating(uri, msg.sender);
        }

        uint64 stake = rating.stake;
        uint8 score = rating.score;
        delete ratings[uri][msg.sender]; // prevent re-entrancy
        pay(msg.sender, stake);
        emit RatingRemoved(uri, msg.sender, score, stake);
    }

    // Remove someone else's rating - get their stake.
    function cleanupRating(bytes32 uri, address rater) external {
        if (rater == address(0)) {
            revert InvalidRater(rater);
        }

        Rating storage rating = ratings[uri][rater];

        if (rating.posted + rating.stake > block.timestamp) {
            revert RatingIsStillValid(rating.posted, rating.stake);
        }

        uint64 stake = rating.stake;
        uint8 score = rating.score;
        delete ratings[uri][rater]; // prevent re-entrancy
        emit RatingCleanedUp(uri, rater, score, stake);
        pay(rater, stake);
    }

    function getRating(
        bytes32 uri,
        address rater
    ) external view returns (Rating memory) {
        return ratings[uri][rater];
    }

    function pay(address recipient, uint64 stake) internal {
        payable(recipient).transfer(uint256(stake) * STAKE_PER_SECOND);
    }

    function validScore(uint8 score) internal pure returns (bool) {
        return score >= 1 && score <= 5;
    }

    function validStake(uint64 stake) internal pure returns (bool) {
        return stake >= MIN_STAKE && stake % STAKE_PER_SECOND == 0;
    }
}
