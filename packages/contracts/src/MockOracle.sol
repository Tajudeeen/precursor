// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockOracle — feeds a single price per asset to the LendingPool.
/// @notice The oracle holds a privileged `setPrice` function, restricted to the
///         owner. The vulnerability this demo models is NOT that the feed is
///         world-writable — it is that the LendingPool trusts a single spot
///         price point with no TWAP, deviation guard, or circuit breaker. In
///         the attack scenario the owner stands in for a manipulated or
///         compromised feed: whoever moves the price, the pool follows it.
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

    /// @dev The attack and defense scenarios drive the price through this
    ///      function from the owner account. A real oracle would additionally
    ///      have TWAP, slippage limits and deviation guards — this one does
    ///      not, which is the deliberate vulnerability being demonstrated.
    function setPrice(address token, uint256 newPrice) external onlyOwner {
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
