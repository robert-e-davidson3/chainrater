// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Script.sol";
import "../src/Ratings.sol";

contract PopulateWithTestData is Script {
    // Sample URIs to populate with ratings
    string[] uriStrings;
    uint256[] userPrivateKeys;
    address[] userAddresses;

    function setUp() public {
        // Initialize sample URIs
        uriStrings.push("https://github.com");
        uriStrings.push("https://twitter.com");
        uriStrings.push("https://youtube.com");
        uriStrings.push("https://reddit.com");
        uriStrings.push("https://opensea.io");
        
        // Log URIs
        for (uint i = 0; i < uriStrings.length; i++) {
            bytes32 hash = keccak256(bytes(uriStrings[i]));
            console.log("URI: %s, Hash: %s", uriStrings[i], vm.toString(hash));
        }

        userPrivateKeys.push(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        userPrivateKeys.push(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d);
        userPrivateKeys.push(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a);
        userPrivateKeys.push(0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6);
        userPrivateKeys.push(0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a);

        for (uint i = 0; i < userPrivateKeys.length; i++) {
            userAddresses.push(vm.addr(userPrivateKeys[i]));
            console.log("Test user %d: %s", i, userAddresses[i]);
        }
    }

    function run() external {
        // Get contract addresses - assumes they're already deployed
        address ratingsAddress = vm.envAddress("RATINGS_ADDRESS");

        console.log("Using Ratings contract at: %s", ratingsAddress);

        Ratings ratings = Ratings(ratingsAddress);

        uint64 minStake = ratings.MIN_STAKE();
        console.log("Minimum stake: %d wei", minStake);
        
        // Submitting ratings for each user and URI combination
        for (uint i = 0; i < userPrivateKeys.length; i++) {
            // Pretend to be the user
            vm.startBroadcast(userPrivateKeys[i]);
            
            console.log("Creating ratings from account: %s", userAddresses[i]);
            
            // Each user rates several URIs
            for (uint j = 0; j < uriStrings.length; j++) {
                // Generate different scores for variety (1-5)
                uint8 score = uint8(((i + j) % 5) + 1);
                
                // Calculate a varied stake (between MIN_STAKE and 2*MIN_STAKE)
                uint64 stake = minStake + uint64((i * j * 1e16) % minStake);
                
                console.log("  Rating URI: %s with score: %d, stake: %d", uriStrings[j], score, stake);
                
                // Submit rating using string URI
                ratings.submitRating{value: stake}(uriStrings[j], score);
            }
            
            vm.stopBroadcast();
        }

        console.log("Test data population complete!");
        console.log(
            "Populated ratings data for %d users and %d URIs",
            userPrivateKeys.length,
            uriStrings.length
        );
    }
}
