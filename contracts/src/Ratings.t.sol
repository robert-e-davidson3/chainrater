// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../src/Ratings.sol";

contract RatingTest is Test {
    Ratings public ratings;
    address public user1;
    address public user2;
    bytes32 public testUri;

    fallback() external payable {}

    receive() external payable {}

    function setUp() public {
        ratings = new Ratings();
        user1 = address(0x1111);
        user2 = address(0x2222);
        testUri = keccak256("place://Five Guys");

        // Fund test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(address(this), 100 ether);
    }

    // Test basic rating submission
    function testSubmitRating() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        // Just send the MIN_STAKE value directly
        ratings.submitRating{value: stake}(testUri, score);

        Ratings.Rating memory r = ratings.getRating(testUri, address(this));
        assertEq(r.score, score);
        assertEq(r.stake, stake / ratings.STAKE_PER_SECOND());
        assertEq(r.posted, block.timestamp);
    }

    // Test all valid ratings (1-5)
    function testAllValidRatings() public {
        for (uint8 i = 1; i <= 5; i++) {
            bytes32 uri = keccak256(abi.encodePacked("test://site", i));
            uint64 stake = ratings.MIN_STAKE();

            ratings.submitRating{value: stake}(uri, i);

            Ratings.Rating memory r = ratings.getRating(uri, address(this));
            assertEq(r.score, i);
        }
    }

    // Test rating too low (0)
    function testRatingTooLow() public {
        uint8 invalidScore = 0;
        uint64 stake = ratings.MIN_STAKE();

        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidScore.selector, invalidScore)
        );
        ratings.submitRating{value: stake}(testUri, invalidScore);
    }

    // Test rating too high (6)
    function testRatingTooHigh() public {
        uint8 invalidScore = 6;
        uint64 stake = ratings.MIN_STAKE();

        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidScore.selector, invalidScore)
        );
        ratings.submitRating{value: stake}(testUri, invalidScore);
    }

    // Test invalid stake (too low)
    function testStakeTooLow() public {
        uint8 score = 5;
        uint64 invalidStake = ratings.MIN_STAKE() - 16; // One second less than minimum

        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidStake.selector, invalidStake)
        );
        ratings.submitRating{value: invalidStake}(testUri, score);
    }

    // Test invalid stake (not multiple of STAKE_PER_SECOND)
    function testStakeNotMultiple() public {
        uint8 score = 5;
        uint64 invalidStake = ratings.MIN_STAKE() + 1; // Not divisible by STAKE_PER_SECOND

        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidStake.selector, invalidStake)
        );
        ratings.submitRating{value: invalidStake}(testUri, score);
    }

    // Test replacing existing rating (should refund previous stake)
    function testReplaceRating() public {
        uint8 initialScore = 3;
        uint64 initialStake = ratings.MIN_STAKE();

        // Submit initial rating
        ratings.submitRating{value: initialStake}(testUri, initialScore);

        uint256 balanceBefore = address(this).balance;

        // Replace with new rating
        uint8 newScore = 5;
        uint64 newStake = ratings.MIN_STAKE() * 2;
        ratings.submitRating{value: newStake}(testUri, newScore);

        // Check balance - should have received refund of initial stake
        uint256 expectedRefund = initialStake;
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter, balanceBefore + expectedRefund - newStake);

        // Check new rating is saved
        Ratings.Rating memory r = ratings.getRating(testUri, address(this));
        assertEq(r.score, newScore);
        assertEq(r.stake, newStake / ratings.STAKE_PER_SECOND());
    }

    // Test removing your own rating
    function testRemoveRating() public {
        uint8 score = 4;
        uint64 stake = ratings.MIN_STAKE();

        // Submit a rating
        ratings.submitRating{value: stake}(testUri, score);

        uint256 balanceBefore = address(this).balance;

        // Remove the rating
        ratings.removeRating(testUri);

        // Check balance - should have received refund
        uint256 expectedRefund = stake;
        assertEq(address(this).balance, balanceBefore + expectedRefund);

        // Check rating is removed
        Ratings.Rating memory r = ratings.getRating(testUri, address(this));
        assertEq(r.score, 0);
        assertEq(r.stake, 0);
        assertEq(r.posted, 0);
    }

    // Test removing nonexistent rating
    function testRemoveNonexistentRating() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ratings.NoSuchRating.selector,
                testUri,
                address(this)
            )
        );
        ratings.removeRating(testUri);
    }

    // Test cleanup of expired rating
    function testCleanupExpiredRating() public {
        vm.startPrank(user1);

        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();
        ratings.submitRating{value: stake}(testUri, score);

        vm.stopPrank();

        // Fast forward time to make the rating expire
        uint64 durationInSeconds = stake / ratings.STAKE_PER_SECOND();
        vm.warp(block.timestamp + durationInSeconds + 1);

        uint256 balanceBeforeUser1 = user1.balance;

        // Cleanup the expired rating
        ratings.cleanupRating(testUri, user1);

        // Check the refund went to the original rater (user1)
        uint256 expectedRefund = stake;
        assertEq(user1.balance, balanceBeforeUser1 + expectedRefund);

        // Check rating is removed
        Ratings.Rating memory r = ratings.getRating(testUri, user1);
        assertEq(r.score, 0);
        assertEq(r.stake, 0);
        assertEq(r.posted, 0);
    }

    // Test cleanup of still valid rating
    function testCleanupValidRating() public {
        vm.startPrank(user1);

        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();
        ratings.submitRating{value: stake}(testUri, score);

        vm.stopPrank();

        // Try to cleanup a still valid rating
        vm.expectRevert(
            abi.encodeWithSelector(
                Ratings.RatingIsStillValid.selector,
                uint64(block.timestamp),
                stake / ratings.STAKE_PER_SECOND()
            )
        );
        ratings.cleanupRating(testUri, user1);
    }

    // Test cleanup with invalid rater
    function testCleanupInvalidRater() public {
        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidRater.selector, address(0))
        );
        ratings.cleanupRating(testUri, address(0));
    }

    // Alternative approach to test events
    function testRatingSubmittedEvent() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        // Start recording all emitted events
        vm.recordLogs();

        // Perform the action that emits the event
        ratings.submitRating{value: stake}(testUri, score);

        // Get the recorded logs
        Vm.Log[] memory entries = vm.getRecordedLogs();

        // There should be at least one log entry
        assertGt(entries.length, 0);

        // The first topic is the event signature
        bytes32 eventSignature = keccak256(
            "RatingSubmitted(bytes32,address,uint8,uint64)"
        );
        assertEq(entries[0].topics[0], eventSignature);

        // Check that the indexed parameters match
        assertEq(entries[0].topics[1], testUri);
        assertEq(
            entries[0].topics[2],
            bytes32(uint256(uint160(address(this))))
        );

        // For non-indexed parameters, we'd need to decode the data
        // This is a simpler approach that just verifies the event was emitted with correct indexed params
    }

    function testPreciseCleanupExpiry() public {
        vm.startPrank(user1);

        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();
        uint64 posted = uint64(block.timestamp);
        uint64 duration = stake / ratings.STAKE_PER_SECOND();
        ratings.submitRating{value: stake}(testUri, score);

        vm.stopPrank();

        // Fast forward time to just before expiry
        vm.warp(posted + duration - 1);

        // Rating should still be valid
        vm.expectRevert(
            abi.encodeWithSelector(
                Ratings.RatingIsStillValid.selector,
                posted,
                stake / ratings.STAKE_PER_SECOND()
            )
        );
        ratings.cleanupRating(testUri, user1);

        // Fast forward one more second to make it expire
        vm.warp(block.timestamp + 1);

        // Now the cleanup should succeed
        ratings.cleanupRating(testUri, user1);
    }

    // Test multiple users rating the same URI
    function testMultipleUsersRating() public {
        uint8 score1 = 4;
        uint8 score2 = 5;
        uint64 stake = ratings.MIN_STAKE();

        // User 1 submits rating
        vm.prank(user1);
        ratings.submitRating{value: stake}(testUri, score1);

        // User 2 submits rating
        vm.prank(user2);
        ratings.submitRating{value: stake}(testUri, score2);

        // Check both ratings exist and are independent
        Ratings.Rating memory r1 = ratings.getRating(testUri, user1);
        assertEq(r1.score, score1);

        Ratings.Rating memory r2 = ratings.getRating(testUri, user2);
        assertEq(r2.score, score2);
    }

    // Test different URIs for the same user
    function testMultipleUris() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        bytes32 uri1 = keccak256("place://Five Guys");
        bytes32 uri2 = keccak256("place://In-N-Out");

        // Rate two different places
        ratings.submitRating{value: stake}(uri1, score);
        ratings.submitRating{value: stake}(uri2, score - 1);

        // Check both ratings exist
        Ratings.Rating memory r1 = ratings.getRating(uri1, address(this));
        assertEq(r1.score, score);

        Ratings.Rating memory r2 = ratings.getRating(uri2, address(this));
        assertEq(r2.score, score - 1);
    }
}
