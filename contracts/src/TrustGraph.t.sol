// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../src/TrustGraph.sol";

contract TrustGraphTest is Test {
    TrustGraph public trustGraph;
    address public user1;
    address public user2;
    bytes32 public testUri;

    function setUp() public {
        trustGraph = new TrustGraph();
        user1 = address(0x1111);
        user2 = address(0x2222);
        testUri = keccak256("site://example.com");

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(address(this), 100 ether);
    }

    // Test basic address trust
    function testTrustAddress() public {
        uint8 trustLevel = 3;
        
        trustGraph.trustAddress(user1, trustLevel);
        
        uint8 storedTrustLevel = trustGraph.addresses(address(this), user1);
        assertEq(storedTrustLevel, trustLevel);
    }

    // Test basic URI trust
    function testTrustUri() public {
        uint8 trustLevel = 4;
        
        trustGraph.trustURI(testUri, trustLevel);
        
        uint8 storedTrustLevel = trustGraph.uris(address(this), testUri);
        assertEq(storedTrustLevel, trustLevel);
    }

    // Test all valid trust levels for addresses (0-5)
    function testAllValidTrustLevelsForAddress() public {
        for (uint8 i = 0; i <= 5; i++) {
            address testAddress = address(uint160(0x3333 + i));
            
            trustGraph.trustAddress(testAddress, i);
            
            uint8 storedTrustLevel = trustGraph.addresses(address(this), testAddress);
            assertEq(storedTrustLevel, i);
        }
    }

    // Test all valid trust levels for URIs (0-5)
    function testAllValidTrustLevelsForUri() public {
        for (uint8 i = 0; i <= 5; i++) {
            bytes32 uri = keccak256(abi.encodePacked("site://example", i));
            
            trustGraph.trustURI(uri, i);
            
            uint8 storedTrustLevel = trustGraph.uris(address(this), uri);
            assertEq(storedTrustLevel, i);
        }
    }

    // Test trust level too high (6) for address
    function testTrustLevelTooHighForAddress() public {
        uint8 invalidTrustLevel = 6;
        
        vm.expectRevert(
            abi.encodeWithSelector(TrustGraph.InvalidTrust.selector, invalidTrustLevel)
        );
        trustGraph.trustAddress(user1, invalidTrustLevel);
    }

    // Test trust level too high (6) for URI
    function testTrustLevelTooHighForUri() public {
        uint8 invalidTrustLevel = 6;
        
        vm.expectRevert(
            abi.encodeWithSelector(TrustGraph.InvalidTrust.selector, invalidTrustLevel)
        );
        trustGraph.trustURI(testUri, invalidTrustLevel);
    }

    // Test updating trust level for address
    function testUpdateTrustLevelForAddress() public {
        uint8 initialTrustLevel = 2;
        uint8 updatedTrustLevel = 4;
        
        // Set initial trust level
        trustGraph.trustAddress(user1, initialTrustLevel);
        
        // Update trust level
        trustGraph.trustAddress(user1, updatedTrustLevel);
        
        // Check updated trust level
        uint8 storedTrustLevel = trustGraph.addresses(address(this), user1);
        assertEq(storedTrustLevel, updatedTrustLevel);
    }

    // Test updating trust level for URI
    function testUpdateTrustLevelForUri() public {
        uint8 initialTrustLevel = 3;
        uint8 updatedTrustLevel = 5;
        
        // Set initial trust level
        trustGraph.trustURI(testUri, initialTrustLevel);
        
        // Update trust level
        trustGraph.trustURI(testUri, updatedTrustLevel);
        
        // Check updated trust level
        uint8 storedTrustLevel = trustGraph.uris(address(this), testUri);
        assertEq(storedTrustLevel, updatedTrustLevel);
    }

    // Test setting trust level to 0 (removing trust) for address
    function testRemoveTrustForAddress() public {
        uint8 initialTrustLevel = 3;
        uint8 zeroTrustLevel = 0;
        
        // Set initial trust level
        trustGraph.trustAddress(user1, initialTrustLevel);
        
        // Remove trust by setting to 0
        trustGraph.trustAddress(user1, zeroTrustLevel);
        
        // Check trust level is now 0
        uint8 storedTrustLevel = trustGraph.addresses(address(this), user1);
        assertEq(storedTrustLevel, zeroTrustLevel);
    }

    // Test setting trust level to 0 (removing trust) for URI
    function testRemoveTrustForUri() public {
        uint8 initialTrustLevel = 4;
        uint8 zeroTrustLevel = 0;
        
        // Set initial trust level
        trustGraph.trustURI(testUri, initialTrustLevel);
        
        // Remove trust by setting to 0
        trustGraph.trustURI(testUri, zeroTrustLevel);
        
        // Check trust level is now 0
        uint8 storedTrustLevel = trustGraph.uris(address(this), testUri);
        assertEq(storedTrustLevel, zeroTrustLevel);
    }

    // Test multiple users trusting the same address with different levels
    function testMultipleUsersTrustingSameAddress() public {
        uint8 trustLevel1 = 2;
        uint8 trustLevel2 = 5;
        
        // User 1 trusts target
        vm.prank(user1);
        trustGraph.trustAddress(user2, trustLevel1);
        
        // This contract trusts target
        trustGraph.trustAddress(user2, trustLevel2);
        
        // Check both trust levels are stored independently
        uint8 storedTrustLevel1 = trustGraph.addresses(user1, user2);
        assertEq(storedTrustLevel1, trustLevel1);
        
        uint8 storedTrustLevel2 = trustGraph.addresses(address(this), user2);
        assertEq(storedTrustLevel2, trustLevel2);
    }

    // Test multiple users trusting the same URI with different levels
    function testMultipleUsersTrustingSameUri() public {
        uint8 trustLevel1 = 3;
        uint8 trustLevel2 = 4;
        
        // User 1 trusts URI
        vm.prank(user1);
        trustGraph.trustURI(testUri, trustLevel1);
        
        // This contract trusts URI
        trustGraph.trustURI(testUri, trustLevel2);
        
        // Check both trust levels are stored independently
        uint8 storedTrustLevel1 = trustGraph.uris(user1, testUri);
        assertEq(storedTrustLevel1, trustLevel1);
        
        uint8 storedTrustLevel2 = trustGraph.uris(address(this), testUri);
        assertEq(storedTrustLevel2, trustLevel2);
    }

    // Test TrustAddress event emission
    function testTrustAddressEvent() public {
        uint8 trustLevel = 4;
        
        // Start recording events
        vm.recordLogs();
        
        // Perform action that emits event
        trustGraph.trustAddress(user1, trustLevel);
        
        // Get recorded logs
        Vm.Log[] memory entries = vm.getRecordedLogs();
        
        // There should be at least one log entry
        assertGt(entries.length, 0);
        
        // The first topic is the event signature
        bytes32 eventSignature = keccak256(
            "TrustAddress(address,address,uint8)"
        );
        assertEq(entries[0].topics[0], eventSignature);
        
        // Check indexed parameters
        assertEq(
            entries[0].topics[1],
            bytes32(uint256(uint160(address(this))))
        );
        assertEq(
            entries[0].topics[2],
            bytes32(uint256(uint160(user1)))
        );
    }

    // Test TrustURI event emission
    function testTrustUriEvent() public {
        uint8 trustLevel = 5;
        
        // Start recording events
        vm.recordLogs();
        
        // Perform action that emits event
        trustGraph.trustURI(testUri, trustLevel);
        
        // Get recorded logs
        Vm.Log[] memory entries = vm.getRecordedLogs();
        
        // There should be at least one log entry
        assertGt(entries.length, 0);
        
        // The first topic is the event signature
        bytes32 eventSignature = keccak256(
            "TrustURI(address,bytes32,uint8)"
        );
        assertEq(entries[0].topics[0], eventSignature);
        
        // Check indexed parameters
        assertEq(
            entries[0].topics[1],
            bytes32(uint256(uint160(address(this))))
        );
        assertEq(entries[0].topics[2], testUri);
    }
}