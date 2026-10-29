// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAavePool {
    address public immutable usdt;
    mapping(address => uint256) public supplied;
    mapping(address => uint256) public withdrawals;

    constructor(address _usdt) { usdt = _usdt; }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        supplied[onBehalfOf] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 bal = IERC20(asset).balanceOf(address(this));
        if (bal < amount) amount = bal;
        IERC20(asset).transfer(to, amount);
        withdrawals[to] += amount;
        return amount;
    }
}