// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../src/Rating.sol";

contract RatingTest is Test {
    Ratings public ratings;
    
    function setUp() public {
        ratings = new Ratings();
    }
    
    function testSubmitRating() public {
        bytes32 uri = keccak256("place://Five Guys");
        uint8 score = 5;
        uint64 stake = ratings.MIN_STAKE();

        ratings.submitRating{value: stake}(uri,score);

        Ratings.Rating memory r = ratings.getRating(uri, address(this));
        assertEq(r.score, score);
        assertEq(r.stake, stake);
        assertEq(r.posted, block.timestamp);
    }
}
