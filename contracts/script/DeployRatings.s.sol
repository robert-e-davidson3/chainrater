// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Script.sol";
import "../src/Ratings.sol";

contract DeployRatings is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        Ratings rating = new Ratings();
        vm.stopBroadcast();

        console.log("Rating contract deployed at: ", address(rating));
    }
}
