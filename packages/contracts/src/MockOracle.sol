// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockOracle — feeds a single price per asset to the LendingPool.
/// @notice The oracle holds a privileged `setPrice` function. In the attack
///         scenario the attacker gains temporary control by manipulating a
///         liquidity pool backing the price feed. For V1 this is deterministic:
///         anyone can call setPrice because the vulnerability surface is the
///         lending pool's trust of a single price point with no TWAP or
///         deviation check.
contract MockOracle {
    mapping(address => uint256) public price;          // price * 1e18
    mapping(address => uint256) public decimals;      // asset decimals

    address public immutable owner;

    event PriceUpdated(address indexed token, uint256 newPrice, uint256 scale);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev In the controlled scenario this is the attacker's entry point
    ///      during the oracle-manipulation phase. A real oracle would have
    ///      guards, slippage limits, and TWAP — this one does not, which is
    ///      the deliberate vulnerability.
    function setPrice(address token, uint256 newPrice) external {
        price[token] = newPrice;
        emit PriceUpdated(token, newPrice, 1e18);
    }

    function setDecimals(address token, uint8 dec) external onlyOwner {
        decimals[token] = dec;
    }

    function getPrice(address token) external view returns (uint256) {
        return price[token];
    }

    function getDecimals(address token) external view returns (uint256) {
        return decimals[token] == 0 ? 18 : decimals[token];
    }

    error NotOwner();
}
