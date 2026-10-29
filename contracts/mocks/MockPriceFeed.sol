// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockPriceFeed {
    uint8 public constant decimals = 8;
    int256 public answer = 600e8; // $600
    uint256 public updatedAt = block.timestamp;

    function setPrice(int256 _answer) external {
        answer = _answer;
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
    function setRound(uint80, int256 _answer, uint256, uint256 _updatedAt, uint80) external {
        answer = _answer;
        updatedAt = _updatedAt;
    }
}