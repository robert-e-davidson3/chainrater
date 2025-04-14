// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../src/Rating.sol";

contract RatingTest is Test {
    Rating public rating;
    
    function setUp() public {
        rating = new Rating();
    }
    
    function testSubmitRating() public {
        address target = address(0x1);
        rating.submitRating(target, 5);
        assertEq(rating.getRating(target), 5);
    }
    
    function testInvalidRating() public {
        address target = address(0x1);
        vm.expectRevert("Rating must be between 1 and 5");
        rating.submitRating(target, 6);
    }
}
