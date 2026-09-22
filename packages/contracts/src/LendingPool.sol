// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MockOracle } from "./MockOracle.sol";
import { ControlledCollateral } from "./ControlledCollateral.sol";
import { SecurityController } from "./SecurityController.sol";

/// @title LendingPool — a minimal, deliberately vulnerable lending protocol.
///
/// @notice VULNERABILITY: The pool trusts a single oracle price point with no
///         TWAP, deviation guard, or circuit breaker. An attacker who can
///         move the oracle price can inflate their collateral valuation,
///         borrow beyond legitimate capacity, and then withdraw more
///         collateral than the protocol can sustain.
///
///         The "withdraw" function sends collateral to the user. The borrow
///         function creates debt. The attack sequence:
///         1. Deposit 100e18 collateral ($100 value at $1)
///         2. Borrow 75e18 (max capacity at $1)
///         3. Manipulate oracle to $1.80 (collateral now worth $180)
///         4. Borrow 60e18 more (total 135e18 debt, now within $135 capacity)
///         5. Withdraw ALL collateral (100e18) + keep the borrowed 135e18
///            The pool loses 100e18 collateral but the attacker only owes
///            135e18 debt against now-worthless (snapped-back) collateral.
///            Net protocol loss: 100e18 - 0 (collateral gone) + 135e18 debt
///            but the collateral sent = 100e18 which exceeds the honest value.
///
///         When SecurityController is enabled, withdraw() delegates to it
///         for a deterministic BLOCK decision based on simulated state.
contract LendingPool {
    MockOracle public immutable oracle;
    ControlledCollateral public immutable collateral;
    SecurityController public securityController;

    mapping(address => uint256) public totalCollateral;
    mapping(address => uint256) public totalBorrows;
    mapping(address => uint256) public userCollateral;
    mapping(address => uint256) public userDebt;

    uint256 public constant BORROW_FACTOR = 7500; // can borrow up to 75% of collateral value
    uint256 public constant BPS = 10_000;

    event CollateralDeposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 collateralValue);
    event Withdrawn(address indexed user, uint256 collateralOut, uint256 debtRepaid);
    event SecurityControllerSet(address controller);

    address public owner;
    bool public securityControllerEnabled;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenControllerEnabled() {
        if (!securityControllerEnabled) revert ControllerNotEnabled();
        _;
    }

    constructor(address _oracle, address _collateral) {
        owner = msg.sender;
        oracle = MockOracle(_oracle);
        collateral = ControlledCollateral(_collateral);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        owner = newOwner;
    }

    function setSecurityController(address _controller) external onlyOwner {
        securityController = SecurityController(_controller);
        securityControllerEnabled = true;
        emit SecurityControllerSet(_controller);
    }

    function disableSecurityController() external onlyOwner {
        securityControllerEnabled = false;
    }

    function deposit(uint256 amount) external {
        collateral.transferFrom(msg.sender, address(this), amount);
        userCollateral[msg.sender] += amount;
        uint256 price = oracle.getPrice(address(collateral));
        totalCollateral[address(collateral)] += (amount * price) / 1e18;
        emit CollateralDeposited(msg.sender, amount);
    }

    function borrow(uint256 amount) external {
        uint256 collateralValue = _collateralValue(msg.sender);
        uint256 maxBorrowable = (collateralValue * BORROW_FACTOR) / BPS;
        if (userDebt[msg.sender] + amount > maxBorrowable) {
            revert BorrowExceedsCapacity();
        }
        userDebt[msg.sender] += amount;
        totalBorrows[address(collateral)] += amount;
        emit Borrowed(msg.sender, amount, collateralValue);
    }

    /// @notice Withdraw collateral. In the vulnerable design, the pool sends
    ///         back raw collateral tokens (1:1). The borrow capacity check
    ///         is based on oracle price, so after price manipulation the
    ///         attacker can borrow more and still withdraw full collateral.
    ///
    /// @dev When the SecurityController is enabled, the caller provides
    ///      projected/simulated state values. The controller checks the
    ///      invariant and may BLOCK the withdrawal.
    ///
    /// @param withdrawAmount  Amount of collateral tokens to send back.
    /// @param projectedCollateralValue  Simulated collateral value after full sequence.
    /// @param projectedDebtValue        Simulated debt after full sequence.
    /// @param behaviorFlagged           Whether the behavior engine flagged this.
    /// @param behaviorConfidence        Confidence score 0-100.
    function withdraw(
        uint256 withdrawAmount,
        uint256 projectedCollateralValue,
        uint256 projectedDebtValue,
        bool behaviorFlagged,
        uint256 behaviorConfidence
    ) external {
        // VULNERABLE: no invariant check here when unprotected
        if (withdrawAmount > userCollateral[msg.sender]) revert InsufficientCollateral();

        if (securityControllerEnabled) {
            (
                SecurityController.Decision decision,
                ,
                uint256 ratioBps
            ) = securityController.evaluateDefenseWithBehaviorEvidence(
                msg.sender,
                withdrawAmount,
                projectedCollateralValue,
                projectedDebtValue,
                behaviorFlagged,
                behaviorConfidence,
                block.timestamp
            );

            if (decision == SecurityController.Decision.Block) {
                revert WithdrawBlocked("simulation predicts invariant violation");
            }
            if (decision == SecurityController.Decision.Review) {
                revert WithdrawBlocked("withdrawal requires manual review: collateral ratio approaching threshold");
            }
        }

        uint256 price = oracle.getPrice(address(collateral));
        uint256 withdrawVal = (withdrawAmount * price) / 1e18;
        if (withdrawVal > totalCollateral[address(collateral)]) {
            totalCollateral[address(collateral)] = 0;
        } else {
            totalCollateral[address(collateral)] -= withdrawVal;
        }

        userCollateral[msg.sender] -= withdrawAmount;

        collateral.transfer(msg.sender, withdrawAmount);
        emit Withdrawn(msg.sender, withdrawAmount, 0);
    }

    function repay(uint256 amount) external {
        uint256 myDebt = userDebt[msg.sender];
        if (amount > myDebt) amount = myDebt;
        userDebt[msg.sender] = myDebt - amount;
        if (amount > totalBorrows[address(collateral)]) {
            totalBorrows[address(collateral)] = 0;
        } else {
            totalBorrows[address(collateral)] -= amount;
        }
        collateral.transferFrom(msg.sender, address(this), amount);
    }

    function _collateralValue(address user) internal view returns (uint256) {
        uint256 rawCollateral = userCollateral[user];
        if (rawCollateral == 0) return 0;
        uint256 price = oracle.getPrice(address(collateral));
        return (rawCollateral * price) / 1e18;
    }

    function getBorrowCapacity(address user) external view returns (uint256) {
        uint256 collateralValue = _collateralValue(user);
        return (collateralValue * BORROW_FACTOR) / BPS;
    }

    // =====================================================
    // Read helpers for the off-chain behavior/simulation engine
    // =====================================================

    function getUserState(address user)
        external
        view
        returns (
            uint256 collateralDeposited,
            uint256 debt,
            uint256 collateralValue,
            uint256 borrowCapacity
        )
    {
        collateralDeposited = userCollateral[user];
        debt = userDebt[user];
        collateralValue = _collateralValue(user);
        borrowCapacity = (collateralValue * BORROW_FACTOR) / BPS;
    }

    function getInvariant()
        external
        view
        returns (
            uint256 minRatioBps,
            uint256 currentRatioBps,
            bool healthy
        )
    {
        minRatioBps = 15000; // 150%
        uint256 totalCollatValue = totalCollateral[address(collateral)];
        if (totalBorrows[address(collateral)] == 0) {
            return (minRatioBps, 100000, true);
        }
        uint256 ratio = (totalCollatValue * 10_000) / totalBorrows[address(collateral)];
        return (minRatioBps, ratio, ratio >= minRatioBps);
    }

    error BorrowExceedsCapacity();
    error InsufficientDebt();
    error InsufficientCollateral();
    error WithdrawBlocked(string reason);
    error ControllerNotEnabled();
    error Unauthorized();
}
