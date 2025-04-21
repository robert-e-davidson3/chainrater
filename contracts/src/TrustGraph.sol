// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract TrustGraph {
    event TrustAddress(
        address indexed truster,
        address indexed trustee,
        uint8 trustLevel
    );

    event TrustURI(
        address indexed truster,
        bytes32 indexed uri,
        uint8 trustLevel
    );

    error InvalidTrust(uint8 trust);

    // Truster => Trustee => TrustLevel
    mapping(address => mapping(address => uint8)) public addresses;

    // Truster => URI => TrustLevel
    mapping(address => mapping(bytes32 => uint8)) public uris;

    function trustAddress(address trustee, uint8 trustLevel) external {
        if (!validTrust(trustLevel)) revert InvalidTrust(trustLevel);
        addresses[msg.sender][trustee] = trustLevel;
        emit TrustAddress(msg.sender, trustee, trustLevel);
    }

    function trustURI(bytes32 uri, uint8 trustLevel) external {
        if (!validTrust(trustLevel)) revert InvalidTrust(trustLevel);
        uris[msg.sender][uri] = trustLevel;
        emit TrustURI(msg.sender, uri, trustLevel);
    }

    // trustLevel is a number between 1 and 5
    // 1 = no trust, 5 = full trust
    // 0 = no trust level set
    function validTrust(uint8 trustLevel) internal pure returns (bool) {
        return trustLevel <= 5;
    }
}
