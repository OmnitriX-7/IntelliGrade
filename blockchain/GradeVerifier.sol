// Deployed to Polygon Amoy Testnet
// Contract Address: 0xfcc16504bE8BbB8a0133Bc56d565E7Cb86B09DE1
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GradeVerifier {
    address public owner;

    // Maps a "Student+Exam ID" string to a "Hash Fingerprint" string.
    mapping(string => string) private gradeHashes;

    // Emitted when a grade hash is recorded, enabling on-chain audit trails
    event GradeRecorded(string indexed recordKey, string dataHash);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // Saves the data to the map (Costs Gas / Write) — restricted to contract owner
    function recordGradeHash(string memory recordKey, string memory dataHash) public onlyOwner {
        gradeHashes[recordKey] = dataHash;
        emit GradeRecorded(recordKey, dataHash);
    }

    // Reads the data from the map (Free / Read)
    function getGradeHash(string memory recordKey) public view returns (string memory) {
        return gradeHashes[recordKey];
    }
}