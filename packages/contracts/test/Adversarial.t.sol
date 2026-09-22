// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { LendingPool } from "../src/LendingPool.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";

/// @notice Adversarial tests: try to break the defense, verify fail-safe.
///
///         The gate derives the post-withdrawal position from on-chain state,
///         so the caller's only levers are *who* and *how much*. These tests
///         pin both directions: the attack shapes must be blocked, and
///         legitimate withdrawals must still go through.
contract AdversarialTest is Test {
    MockOracle          oracle;
    ControlledCollateral collateral;
    LendingPool         pool;
    SecurityController  controller;

    address internal attacker;
    address internal attackerSybil;
    address internal deployer;

    uint256 internal constant INITIAL_PRICE = 1e18;
    uint256 internal constant INFLATED_PRICE = 18e17;
    uint256 internal constant COLLATERAL_DEPOSIT = 100e18;

    function setUp() public {
        deployer  = address(100);
        attacker  = address(200);
        attackerSybil = address(201);

        vm.deal(deployer, 10000 ether);
        vm.deal(attacker, 10000 ether);
        vm.deal(attackerSybil, 10000 ether);

        vm.startPrank(deployer);
        oracle     = new MockOracle();
        collateral = new ControlledCollateral();
        pool       = new LendingPool(address(oracle), address(collateral));

        oracle.setDecimals(address(collateral), 18);
        oracle.setPrice(address(collateral), INITIAL_PRICE);

        collateral.mint(attacker, COLLATERAL_DEPOSIT);
        collateral.mint(attackerSybil, COLLATERAL_DEPOSIT);

        // Deploy and arm controller by default for adversarial tests
        controller = new SecurityController(
            address(oracle),
            address(collateral),
            address(pool),
            address(0)
        );
        pool.setSecurityController(address(controller));
        vm.stopPrank();
    }

    /// @dev Deposit `amount` and optionally borrow, as the attacker.
    function _openPosition(uint256 deposit, uint256 borrowAmount) internal {
        vm.prank(attacker);
        collateral.approve(address(pool), deposit);
        vm.prank(attacker);
        pool.deposit(deposit);
        if (borrowAmount > 0) {
            vm.prank(attacker);
            pool.borrow(borrowAmount);
        }
    }

    /// @dev The oracle owner moves the price. `MockOracle.setPrice` is
    ///      owner-only; the owner stands in for a manipulated price feed.
    function _movePrice(uint256 newPrice) internal {
        vm.prank(deployer);
        oracle.setPrice(address(collateral), newPrice);
    }

    // =====================================================
    // False positive: legitimate withdrawals must not be blocked
    // =====================================================

    /// A debt-free depositor has no invariant to violate and must not be gated.
    function testDebtFreeUserCanWithdraw() public {
        _openPosition(COLLATERAL_DEPOSIT, 0);

        assertEq(pool.userDebt(attacker), 0, "precondition: no debt outstanding");

        vm.prank(attacker);
        pool.withdraw(COLLATERAL_DEPOSIT / 2);

        (uint256 remainingCollat, , , ) = pool.getUserState(attacker);
        assertEq(remainingCollat, COLLATERAL_DEPOSIT / 2);
    }

    /// A levered but comfortably collateralized position clears the gate.
    /// deposit 100, borrow 30, withdraw 30 → 70 collateral against 30 debt
    /// = 233% >= 170%, so it is an unremarkable Allow.
    function testHealthyPositionCanWithdraw() public {
        _openPosition(COLLATERAL_DEPOSIT, 30e18);

        vm.prank(attacker);
        pool.withdraw(30e18);

        (uint256 remainingCollat, , , ) = pool.getUserState(attacker);
        assertEq(remainingCollat, COLLATERAL_DEPOSIT - 30e18);
        assertEq(pool.userDebt(attacker), 30e18, "withdraw must not touch debt");
    }

    // =====================================================
    // Sybil attack: multiple wallets trying to exploit
    // =====================================================

    function testSybilAttackBlocked() public {
        // Deposits and borrows to the max at the honest price.
        _openPosition(COLLATERAL_DEPOSIT, 0);
        uint256 cap = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(cap);

        // The feed moves to $1.80.
        _movePrice(INFLATED_PRICE);

        // Attacker borrows the phantom capacity the inflated price unlocked.
        uint256 inflatedCap = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(inflatedCap - cap);

        // Withdrawing everything leaves 0 collateral against real debt.
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(COLLATERAL_DEPOSIT);
    }

    // =====================================================
    // Repeated attacker attempts
    // =====================================================

    function testRepeatedAttackerAttemptsStayBlocked() public {
        _openPosition(COLLATERAL_DEPOSIT, 75e18);

        _movePrice(INFLATED_PRICE);

        // First attempt - blocked
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(COLLATERAL_DEPOSIT);

        // Second attempt - still blocked
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(COLLATERAL_DEPOSIT);

        (uint256 remainingCollat, , , ) = pool.getUserState(attacker);
        assertEq(remainingCollat, COLLATERAL_DEPOSIT, "collateral must not have moved");
    }

    /// Partial withdrawals are gated too — the check is on the resulting
    /// position, not on whether the withdrawal happens to be for everything.
    /// deposit 100, borrow 70, withdraw 40 → 60 collateral against 70 debt
    /// = 85% < 150%.
    function testPartialWithdrawalBreachingInvariantIsBlocked() public {
        _openPosition(COLLATERAL_DEPOSIT, 70e18);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(40e18);
    }

    // =====================================================
    // Controller disabled = no protection (attack succeeds)
    // =====================================================

    function testControllerDisableReEnablesAttack() public {
        _openPosition(COLLATERAL_DEPOSIT, 0);

        _movePrice(INFLATED_PRICE);

        // Disable controller
        vm.prank(deployer);
        pool.disableSecurityController();

        // Now withdraw succeeds even with bad state
        vm.prank(attacker);
        pool.withdraw(COLLATERAL_DEPOSIT);

        // Attacker got collateral back
        assertGt(collateral.balanceOf(attacker), 0);
    }

    // =====================================================
    // Evasion: an underwater position cannot talk its way out
    // =====================================================

    /// The attacker owes 50e18 on-chain and withdraws half the collateral,
    /// leaving 50e18 backing 50e18 = exactly 100%, under the 150% minimum.
    /// The controller reads the debt from the pool, so there is no argument
    /// that makes this look solvent.
    function testAttackerWithDebtCannotWithdrawBelowMinimumRatio() public {
        _openPosition(COLLATERAL_DEPOSIT, 50e18);

        assertEq(pool.userDebt(attacker), 50e18, "precondition: real on-chain debt");

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(50e18);
    }

    /// The full oracle-manipulation sequence the product exists to stop, with
    /// the attacker supplying nothing but an amount at the final step.
    function testFullAttackSequenceIsBlocked() public {
        _openPosition(COLLATERAL_DEPOSIT, 0);
        uint256 capAtFairPrice = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(capAtFairPrice);

        _movePrice(INFLATED_PRICE);

        uint256 capAtInflatedPrice = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(capAtInflatedPrice - capAtFairPrice);
        assertEq(pool.userDebt(attacker), 135e18, "precondition: 135e18 debt outstanding");

        uint256 poolBalanceBefore = collateral.balanceOf(address(pool));

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(COLLATERAL_DEPOSIT);

        assertEq(
            collateral.balanceOf(address(pool)),
            poolBalanceBefore,
            "pool drained: collateral left the protocol against unbacked debt"
        );
    }

    // =====================================================
    // Accounting tests: incremental deposits and clean withdrawal clears
    // =====================================================

    function testDepositAndWithdrawAccountingAccuracy() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);

        // Deposit 20 tokens
        vm.prank(attacker);
        pool.deposit(20e18);
        assertEq(pool.totalCollateral(address(collateral)), 20e18);

        // Deposit 20 more tokens (should be 40e18 total, not inflated)
        vm.prank(attacker);
        pool.deposit(20e18);
        assertEq(pool.totalCollateral(address(collateral)), 40e18);

        // Withdraw all 40 tokens (should return to 0)
        vm.prank(attacker);
        pool.withdraw(40e18);
        assertEq(pool.totalCollateral(address(collateral)), 0);
    }

    // =====================================================
    // Invariant tests: Borderline Review threshold is blocked on-chain
    // =====================================================

    /// deposit 100, borrow 50, withdraw 20 → 80 collateral against 50 debt
    /// = 160%, inside the 150–170% review band.
    function testWithdrawalUnderReviewIsBlocked() public {
        _openPosition(COLLATERAL_DEPOSIT, 50e18);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "withdrawal requires manual review: collateral ratio approaching threshold"
            )
        );
        pool.withdraw(20e18);
    }
}
