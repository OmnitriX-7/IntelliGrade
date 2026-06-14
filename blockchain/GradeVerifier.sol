// Deployed to Polygon Amoy Testnet
// Contract Address: 0xfcc16504bE8BbB8a0133Bc56d565E7Cb86B09DE1
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GradeVerifier {
    // Maps a "Student+Exam ID" string to a "Hash Fingerprint" string.
    mapping(string => string) private gradeHashes;

    // Saves the data to the map (Costs Gas / Write)
    function recordGradeHash(string memory recordKey, string memory dataHash) public {
        gradeHashes[recordKey] = dataHash;
    }

    // Reads the data from the map (Free / Read)
    function getGradeHash(string memory recordKey) public view returns (string memory) {
        return gradeHashes[recordKey];
    }
}