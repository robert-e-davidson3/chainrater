// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Rating {
    mapping(address => uint256) public ratings;
    
    event RatingSubmitted(address indexed rater, address indexed target, uint256 rating);
    
    function submitRating(address target, uint256 rating) external {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        ratings[target] = rating;
        emit RatingSubmitted(msg.sender, target, rating);
    }
    
    function getRating(address target) external view returns (uint256) {
        return ratings[target];
    }
}
