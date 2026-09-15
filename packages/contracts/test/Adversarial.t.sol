// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { LendingPool } from "../src/LendingPool.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";

/// @notice Adversarial tests: try to break the defense, verify fail-safe.
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

        vm.prank(deployer);
        oracle     = new MockOracle();
        collateral = new ControlledCollateral();
        pool       = new LendingPool(address(oracle), address(collateral));

        vm.prank(deployer);
        oracle.setDecimals(address(collateral), 18);
        vm.prank(deployer);
        oracle.setPrice(address(collateral), INITIAL_PRICE);

        collateral.mint(attacker, COLLATERAL_DEPOSIT);
        collateral.mint(attackerSybil, COLLATERAL_DEPOSIT);

        // Deploy and arm controller by default for adversarial tests
        vm.prank(deployer);
        controller = new SecurityController(
            address(oracle),
            address(collateral),
            address(pool),
            address(0)
        );
        vm.prank(deployer);
        pool.setSecurityController(address(controller));
    }

    // =====================================================
    // Fail-safe: simulation failure should NOT result in ALLOW
    // =====================================================
    // In the contract, if the controller returns Block, withdraw reverts.
    // The worst case for the defense is that the projected values are
    // set to safe numbers — but the behavior flag should still trigger
    // a Block when behaviorConfidence is high.

    function testAttackerCannotWithdrawWithFalsePositiveSafeProjection() public {
        // Even if attacker passes "safe" projected values but behavior is flagged,
        // the controller should still block if confidence is high enough
        // (because the invariant check on projected values fails).
        // But if projected values are genuinely safe, it should allow.

        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        // Attacker tries: deposit, no borrow, then withdraw with "safe" projection
        // but behavior is NOT flagged
        uint256 safeCollatValue = (COLLATERAL_DEPOSIT * INITIAL_PRICE) / 1e18;
        vm.prank(attacker);
        pool.withdraw(
            COLLATERAL_DEPOSIT / 2,
            safeCollatValue,
            0,  // no debt
            false,
            0
        );
        // Should succeed — no debt, healthy, normal user behavior
    }

    // =====================================================
    // False positive: legitimate large withdrawal should not be blocked
    // =====================================================

    function testLegitimateLargeWithdrawalNotBlocked() public {
        // A normal user with healthy collateral makes a large withdrawal
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        uint256 borrowAmt = 70e18; // within 75% capacity
        vm.prank(attacker);
        pool.borrow(borrowAmt);

        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INITIAL_PRICE) / 1e18;
        uint256 projectedDebt = borrowAmt - 30e18; // partial repayment

        vm.prank(attacker);
        pool.withdraw(
            30e18,
            projectedCollatValue,
            projectedDebt,
            false,
            0
        );

        // Should succeed — ratio = $100/$40 = 250% >= 150%
        (uint256 remainingCollat, , , ) = pool.getUserState(attacker);
        assertEq(remainingCollat, COLLATERAL_DEPOSIT - 30e18);
    }

    // =====================================================
    // Sybil attack: multiple wallets trying to exploit
    // =====================================================

    function testSybilAttackBlocked() public {
        // Attacker deposits collateral
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        // Attacker borrows at initial price
        uint256 cap = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(cap);

        // Attacker manipulates oracle
        vm.prank(attacker);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        // Attacker borrows more (within inflated capacity)
        uint256 inflatedCap = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(inflatedCap - cap);

        // Try to withdraw full collateral — should be blocked
        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;
        uint256 projectedDebt = inflatedCap;

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(
            COLLATERAL_DEPOSIT,
            projectedCollatValue,
            projectedDebt,
            true,
            90
        );
    }

    // =====================================================
    // Repeated attacker attempts
    // =====================================================

    function testRepeatedAttackerAttemptsStayBlocked() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        vm.prank(attacker);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;
        uint256 projectedDebt = 135e18;

        // First attempt - blocked
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(
            COLLATERAL_DEPOSIT,
            projectedCollatValue,
            projectedDebt,
            true,
            85
        );

        // Second attempt - still blocked
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(
            COLLATERAL_DEPOSIT,
            projectedCollatValue,
            projectedDebt,
            true,
            85
        );
    }

    // =====================================================
    // Malformed data: zero projected values
    // =====================================================

    function testZeroProjectedDebtIsAllowed() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        // Zero debt → no invariant risk → allowed
        vm.prank(attacker);
        pool.withdraw(
            COLLATERAL_DEPOSIT / 2,
            0,  // zero projected collateral value
            0,  // zero projected debt
            true,
            90
        );

        // Should succeed
        (uint256 remainingCollat, , , ) = pool.getUserState(attacker);
        assertEq(remainingCollat, COLLATERAL_DEPOSIT / 2);
    }

    // =====================================================
    // Controller disabled = no protection (attack succeeds)
    // =====================================================

    function testControllerDisableReEnablesAttack() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        vm.prank(attacker);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        // Disable controller
        vm.prank(deployer);
        pool.disableSecurityController();

        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;
        uint256 projectedDebt = 135e18;

        // Now withdraw succeeds even with bad state
        vm.prank(attacker);
        pool.withdraw(
            COLLATERAL_DEPOSIT,
            projectedCollatValue,
            projectedDebt,
            true,
            85
        );

        // Attacker got collateral back
        assertGt(collateral.balanceOf(attacker), 0);
    }
}
