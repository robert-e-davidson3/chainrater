// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Test,Vm} from "forge-std/Test.sol";
// import {console} from "forge-std/console.sol";

import {Ratings} from "../src/Ratings.sol";

contract RatingTest is Test {
    Ratings public ratings;
    address public user1;
    address public user2;
    string public testUri;

    fallback() external payable {}

    receive() external payable {}

    function setUp() public {
        ratings = new Ratings();
        user1 = address(0x1111);
        user2 = address(0x2222);
        testUri = "place://Five Guys";

        // Fund test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(address(this), 100 ether);
    }

    // Test basic rating submission
    function testSubmitRating() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        vm.recordLogs();

        ratings.submitRating{value: stake}(testUri, score);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1, "entries.length==1");
        assertEq(
            entries[0].topics[0],
            hash(
                "RatingSubmitted(bytes32,address,uint8,uint128,uint64,bool)"
            ),
            "entries[0].topics[0]"
        );

        Ratings.Rating memory r = ratings.getRatingByString(
            testUri,
            address(this)
        );
        assertEq(r.score, score, "score");
        assertEq(r.stake, stake, "stake");
        assertEq(r.posted, block.timestamp, "posted");
    }

    // Test all valid ratings (1-5)
    function testAllValidRatings() public {
        for (uint8 i = 1; i <= 5; i++) {
            string memory uri = string(abi.encodePacked("test://site", i));
            uint64 stake = ratings.MIN_STAKE();

            ratings.submitRating{value: stake}(uri, i);

            Ratings.Rating memory r = ratings.getRatingByString(
                uri,
                address(this)
            );
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

        // Start recording events for the second submission
        vm.recordLogs();

        // Replace with new rating
        uint8 newScore = 5;
        uint64 newStake = ratings.MIN_STAKE() * 2;
        ratings.submitRating{value: newStake}(testUri, newScore);

        // Check balance - should have received refund of initial stake
        uint256 expectedRefund = initialStake;
        uint256 balanceAfter = address(this).balance;
        assertEq(
            balanceAfter,
            balanceBefore + expectedRefund - newStake,
            "balanceAfter"
        );

        // Check new rating is saved
        Ratings.Rating memory r = ratings.getRatingByString(
            testUri,
            address(this)
        );
        assertEq(r.score, newScore, "r.score");
        assertEq(r.stake, newStake, "r.stake");
    }

    // Test removing your own rating
    function testRemoveRating() public {
        uint8 score = 4;
        uint64 stake = ratings.MIN_STAKE();

        // Submit a rating
        ratings.submitRating{value: stake}(testUri, score);

        uint256 balanceBefore = address(this).balance;

        // Remove the rating
        ratings.removeRating(testUri, address(this));

        // Check balance - should have received refund
        uint256 expectedRefund = stake;
        assertEq(address(this).balance, balanceBefore + expectedRefund);

        // Check rating is removed
        Ratings.Rating memory r = ratings.getRatingByString(
            testUri,
            address(this)
        );
        assertEq(r.score, 0);
        assertEq(r.stake, 0);
        assertEq(r.posted, 0);
    }

    // Test removing nonexistent rating
    function testRemoveNonexistentRating() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ratings.NoSuchRating.selector,
                hash(bytes(testUri)),
                address(this)
            )
        );
        ratings.removeRating(testUri, address(this));
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
        ratings.removeRating(testUri, user1);

        // Check the refund went to the original rater (user1)
        uint256 expectedRefund = stake;
        assertEq(user1.balance, balanceBeforeUser1 + expectedRefund);

        // Check rating is removed
        Ratings.Rating memory r = ratings.getRatingByString(testUri, user1);
        assertEq(r.score, 0);
        assertEq(r.stake, 0);
        assertEq(r.posted, 0);
    }

    // Test cleanup of still valid rating
    function testCleanupValidRating() public {
        vm.startPrank(user1);
        vm.warp(1745950000);

        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();
        ratings.submitRating{value: stake}(testUri, score);

        vm.stopPrank();

        vm.startPrank(user2);

        vm.warp(1745951111);

        // Try to cleanup a still valid rating
        vm.expectRevert(
            abi.encodeWithSelector(
                Ratings.RatingIsStillValid.selector,
                uint64(1745950000),
                stake
            )
        );
        ratings.removeRating(testUri, user1);
        vm.stopPrank();
    }

    // Test cleanup with invalid rater
    function testCleanupInvalidRater() public {
        vm.expectRevert(
            abi.encodeWithSelector(Ratings.InvalidRater.selector, address(0))
        );
        ratings.removeRating(testUri, address(0));
    }

    function testRatingSubmittedEvent() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        // Start recording all emitted events
        vm.recordLogs();

        // Perform the action that emits the event
        ratings.submitRating{value: stake}(testUri, score);

        // Get the recorded logs
        Vm.Log[] memory entries = vm.getRecordedLogs();

        // There should be at least one log entry (RatingSubmitted)
        assertGe(entries.length, 1);

        // The first topic is the event signature
        bytes32 ratingEventSignature = hash(
            "RatingSubmitted(bytes32,address,uint8,uint128,uint64,bool)"
        );

        // Find both events
        bytes32 testUriHash = hash(bytes(testUri));
        bool foundRatingSubmitted = false;

        for (uint i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == ratingEventSignature) {
                foundRatingSubmitted = true;
                // Check that the indexed parameters match
                assertEq(entries[i].topics[1], testUriHash);
                assertEq(
                    entries[i].topics[2],
                    bytes32(uint256(uint160(address(this))))
                );
            }
        }

        assertTrue(foundRatingSubmitted, "RatingSubmitted event not found");
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
                stake
            )
        );
        ratings.removeRating(testUri, user1);

        // Fast forward one more second to make it expire
        vm.warp(block.timestamp + 1);

        // Now the cleanup should succeed
        ratings.removeRating(testUri, user1);
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
        Ratings.Rating memory r1 = ratings.getRatingByString(testUri, user1);
        assertEq(r1.score, score1);

        Ratings.Rating memory r2 = ratings.getRatingByString(testUri, user2);
        assertEq(r2.score, score2);
    }

    // Test different URIs for the same user
    function testMultipleUris() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        string memory uri1 = "place://Five Guys";
        string memory uri2 = "place://In-N-Out";

        // Rate two different places
        ratings.submitRating{value: stake}(uri1, score);
        ratings.submitRating{value: stake}(uri2, score - 1);

        // Check both ratings exist
        Ratings.Rating memory r1 = ratings.getRatingByString(
            uri1,
            address(this)
        );
        assertEq(r1.score, score);

        Ratings.Rating memory r2 = ratings.getRatingByString(
            uri2,
            address(this)
        );
        assertEq(r2.score, score - 1);
    }

    // Test getAllRatings with no ratings
    function testGetAllRatingsEmpty() public view {
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 0);
        assertEq(total, 0, "total should be 0");
        assertEq(allRatings.length, 0, "ratings array should be empty");
    }

    // Test getAllRatings with a single rating
    function testGetAllRatingsSingle() public {
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();
        ratings.submitRating{value: stake}(testUri, score);

        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 0);
        assertEq(total, 1, "total should be 1");
        assertEq(allRatings.length, 1, "should return 1 rating");
        assertEq(allRatings[0].score, score, "score should match");
        assertEq(allRatings[0].rater, address(this), "rater should match");
        assertEq(
            allRatings[0].uriHash,
            hash(bytes(testUri)),
            "uriHash should match"
        );
    }

    // Test getAllRatings with multiple ratings
    function testGetAllRatingsMultiple() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 5 ratings from different users for different URIs
        vm.prank(user1);
        ratings.submitRating{value: stake}("place://Restaurant A", 5);

        vm.prank(user2);
        ratings.submitRating{value: stake}("place://Restaurant B", 4);

        vm.prank(user1);
        ratings.submitRating{value: stake}("place://Restaurant C", 3);

        vm.prank(address(this));
        ratings.submitRating{value: stake}("place://Restaurant D", 2);

        vm.prank(user2);
        ratings.submitRating{value: stake}("place://Restaurant E", 1);

        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 0);
        assertEq(total, 5, "total should be 5");
        assertEq(allRatings.length, 5, "should return 5 ratings");

        // Verify the order and content
        assertEq(allRatings[0].score, 5, "first rating score");
        assertEq(allRatings[0].rater, user1, "first rating rater");
        assertEq(allRatings[1].score, 4, "second rating score");
        assertEq(allRatings[1].rater, user2, "second rating rater");
        assertEq(allRatings[2].score, 3, "third rating score");
        assertEq(allRatings[3].score, 2, "fourth rating score");
        assertEq(allRatings[4].score, 1, "fifth rating score");
    }

    // Test getAllRatings with pagination (limit)
    function testGetAllRatingsWithLimit() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 5 ratings
        for (uint8 i = 1; i <= 5; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i);
        }

        // Get first 3 ratings
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 3);
        assertEq(total, 5, "total should still be 5");
        assertEq(allRatings.length, 3, "should return 3 ratings");
        assertEq(allRatings[0].score, 1, "first rating score");
        assertEq(allRatings[1].score, 2, "second rating score");
        assertEq(allRatings[2].score, 3, "third rating score");
    }

    // Test getAllRatings with offset
    function testGetAllRatingsWithOffset() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 5 ratings
        for (uint8 i = 1; i <= 5; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i);
        }

        // Get ratings starting from offset 2
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(2, 0);
        assertEq(total, 5, "total should be 5");
        assertEq(allRatings.length, 3, "should return 3 ratings (5-2)");
        assertEq(allRatings[0].score, 3, "first rating score");
        assertEq(allRatings[1].score, 4, "second rating score");
        assertEq(allRatings[2].score, 5, "third rating score");
    }

    // Test getAllRatings with both offset and limit
    function testGetAllRatingsWithOffsetAndLimit() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 10 ratings
        for (uint8 i = 1; i <= 10; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i % 5 + 1);
        }

        // Get 3 ratings starting from offset 3
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(3, 3);
        assertEq(total, 10, "total should be 10");
        assertEq(allRatings.length, 3, "should return 3 ratings");
        assertEq(allRatings[0].score, 5, "first rating score (i=3 :: 3%5+1 = 5");
        assertEq(allRatings[1].score, 1, "second rating score");
        assertEq(allRatings[2].score, 2, "third rating score");
    }

    // Test getAllRatings with offset beyond total
    function testGetAllRatingsOffsetBeyondTotal() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 3 ratings
        for (uint8 i = 1; i <= 3; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i);
        }

        // Try to get ratings starting from offset 10 (beyond total)
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(10, 5);
        assertEq(total, 3, "total should be 3");
        assertEq(allRatings.length, 0, "should return empty array");
    }

    // Test getAllRatings with limit exceeding remaining items
    function testGetAllRatingsLimitExceedsRemaining() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 5 ratings
        for (uint8 i = 1; i <= 5; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i);
        }

        // Request 10 ratings from offset 3 (only 2 remaining)
        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(3, 10);
        assertEq(total, 5, "total should be 5");
        assertEq(allRatings.length, 2, "should return 2 ratings (remaining)");
        assertEq(allRatings[0].score, 4, "first rating score");
        assertEq(allRatings[1].score, 5, "second rating score");
    }

    // Test getAllRatings after a rating is removed
    function testGetAllRatingsAfterRemoval() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 5 ratings (i starts at 49 = ASCII '1')
        for (uint8 i = 49; i <= 53; i++) {
            string memory uri = string(
                abi.encodePacked("place://Restaurant ", i)
            );
            ratings.submitRating{value: stake}(uri, i - 48);
        }

        // Remove the middle rating (51 = ASCII '3')
        ratings.removeRating("place://Restaurant 3", address(this));

        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 0);
        assertEq(total, 4, "total should be 4 after removal");
        assertEq(allRatings.length, 4, "should return 4 ratings");

        // Note: Due to swap-and-pop, the last rating moves to position 3
        assertEq(allRatings[0].score, 1, "first rating score");
        assertEq(allRatings[1].score, 2, "second rating score");
        assertEq(allRatings[2].score, 5, "third rating (was last)");
        assertEq(allRatings[3].score, 4, "fourth rating score");
    }

    // Test getAllRatings with rating updates
    function testGetAllRatingsAfterUpdate() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit 3 ratings
        ratings.submitRating{value: stake}("place://Restaurant A", 5);
        ratings.submitRating{value: stake}("place://Restaurant B", 4);
        ratings.submitRating{value: stake}("place://Restaurant C", 3);

        // Update the first rating
        ratings.submitRating{value: stake * 2}("place://Restaurant A", 2);

        (Ratings.Rating[] memory allRatings, uint256 total) = ratings
            .getAllRatings(0, 0);
        assertEq(total, 3, "total should still be 3");
        assertEq(allRatings.length, 3, "should return 3 ratings");
        assertEq(allRatings[0].score, 2, "first rating updated score");
        assertEq(allRatings[0].stake, stake * 2, "first rating updated stake");
    }

    // Test unhashUris with empty array
    function testUnhashUrisEmpty() public view {
        bytes[] memory uriHashes = new bytes[](0);
        string memory result = ratings.unhashUris(uriHashes);
        assertEq(result, "", "empty array should return empty string");
    }

    // Test unhashUris with single existing URI
    function testUnhashUrisSingle() public {
        uint64 stake = ratings.MIN_STAKE();
        string memory uri = "place://Five Guys";

        // Submit a rating to register the URI
        ratings.submitRating{value: stake}(uri, 5);

        // Query it back
        bytes[] memory uriHashes = new bytes[](1);
        uriHashes[0] = bytes(uri);

        string memory result = ratings.unhashUris(uriHashes);
        assertEq(result, "place://Five Guys\n", "should return URI with newline");
    }

    // Test unhashUris with multiple existing URIs
    function testUnhashUrisMultiple() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit ratings for multiple URIs
        ratings.submitRating{value: stake}("place://Restaurant A", 5);
        ratings.submitRating{value: stake}("place://Restaurant B", 4);
        ratings.submitRating{value: stake}("place://Restaurant C", 3);

        // Query them back
        bytes[] memory uriHashes = new bytes[](3);
        uriHashes[0] = bytes("place://Restaurant A");
        uriHashes[1] = bytes("place://Restaurant B");
        uriHashes[2] = bytes("place://Restaurant C");

        string memory result = ratings.unhashUris(uriHashes);
        assertEq(
            result,
            "place://Restaurant A\nplace://Restaurant B\nplace://Restaurant C\n",
            "should return all URIs separated by newlines"
        );
    }

    // Test unhashUris with non-existing URI
    function testUnhashUrisNonExisting() public view {
        bytes[] memory uriHashes = new bytes[](1);
        uriHashes[0] = bytes("place://NonExistent");

        string memory result = ratings.unhashUris(uriHashes);
        assertEq(result, "<unknown>\n", "should return <unknown> for non-existing URI");
    }

    // Test unhashUris with mix of existing and non-existing URIs
    function testUnhashUrisMixed() public {
        uint64 stake = ratings.MIN_STAKE();

        // Submit rating for one URI
        ratings.submitRating{value: stake}("place://Known Restaurant", 5);

        // Query with mix of known and unknown
        bytes[] memory uriHashes = new bytes[](3);
        uriHashes[0] = bytes("place://Known Restaurant");
        uriHashes[1] = bytes("place://Unknown Restaurant");
        uriHashes[2] = bytes("place://Known Restaurant");

        string memory result = ratings.unhashUris(uriHashes);
        assertEq(
            result,
            "place://Known Restaurant\n<unknown>\nplace://Known Restaurant\n",
            "should handle mix of known and unknown URIs"
        );
    }

    // Wrapper function for making linter happy.
    function hash(bytes memory uri) public pure returns (bytes32 x) {
        /// forge-lint: disable-next-line(asm-keccak256)
        return keccak256(uri);
    }
}
