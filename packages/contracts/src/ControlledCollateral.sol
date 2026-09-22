// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MockOracle } from "./MockOracle.sol";

/// @title ControlledCollateral — a simple ERC20 used as collateral in the
///       lending pool. Has owner-only mint/burn for test setup.
contract ControlledCollateral {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name = "Controlled Collateral";
    string public symbol = "DCC";
    uint8 public immutable decimals = 18;
    uint256 public totalSupply;

    address public immutable owner;

    event Mint(address to, uint256 amount);
    event Burn(address from, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Minting is setup infrastructure, not a protocol feature a caller may
    ///      reach. Left unrestricted, any address could conjure unlimited
    ///      collateral and every "protected" scenario would prove nothing.
    function mint(address to, uint256 amount) external onlyOwner {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Burn(from, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }

    error InsufficientBalance();
    error InsufficientAllowance();
    error NotOwner();
}
