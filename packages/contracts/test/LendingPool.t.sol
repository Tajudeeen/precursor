// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { LendingPool } from "../src/LendingPool.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";

contract LendingPoolTest is Test {
    MockOracle          oracle;
    ControlledCollateral collateral;
    LendingPool         pool;
    SecurityController  controller;

    address internal attacker;
    address internal victim;
    address internal deployer;

    uint256 internal constant INITIAL_PRICE = 1e18;        // $1 per collateral token
    uint256 internal constant INFLATED_PRICE = 18e17;     // $1.80
    uint256 internal constant COLLATERAL_DEPOSIT = 100e18; // 100 tokens
    uint256 internal constant COLLATERAL_VALUE = 100e18;  // $100 at $1

    function setUp() public {
        deployer = address(100);
        attacker = address(200);
        victim   = address(300);

        vm.deal(deployer, 10000 ether);
        vm.deal(attacker, 10000 ether);
        vm.deal(victim, 10000 ether);

        vm.startPrank(deployer);
        oracle     = new MockOracle();
        collateral = new ControlledCollateral();
        pool       = new LendingPool(address(oracle), address(collateral));

        // Grant the pool mint access for the borrow token (simulated)
        oracle.setDecimals(address(collateral), 18);
        oracle.setPrice(address(collateral), INITIAL_PRICE);

        collateral.mint(attacker, COLLATERAL_DEPOSIT);
        collateral.mint(victim, COLLATERAL_DEPOSIT);
        vm.stopPrank();
    }

    function _deployController() internal {
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
    // Basic sanity tests
    // =====================================================

    function testDepositIncreasesCollateral() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        (uint256 deposited, , , ) = pool.getUserState(attacker);
        assertEq(deposited, COLLATERAL_DEPOSIT);
    }

    function testInvariantIsHealthyAtStart() public {
        (uint256 minRatio, , bool healthy) = pool.getInvariant();
        assertGe(minRatio, 15000);
        assertEq(healthy, true);
    }

    function testBorrowCapacityAtInitialPrice() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        // $100 collateral, 75% borrow factor = $75 capacity
        uint256 capacity = pool.getBorrowCapacity(attacker);
        assertEq(capacity, 75e18, "Borrow capacity should be 75% of collateral value");
    }

    // =====================================================
    // Attack scenario: UNPROTECTED run
    // =====================================================

    function testAttackSucceedsUnprotected() public {
        // Ensure no controller (default state)
        assertFalse(pool.securityControllerEnabled());

        // Step 1: Attacker deposits 100e18 collateral
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        // Step 2: Attacker borrows max at $1 = 75e18
        uint256 maxBorrowInitial = pool.getBorrowCapacity(attacker);
        assertEq(maxBorrowInitial, 75e18);
        vm.prank(attacker);
        pool.borrow(maxBorrowInitial);

        // Step 3: The price feed moves to $1.80 (owner-only on the mock; the
        // owner stands in for a manipulated feed)
        vm.prank(deployer);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        // Step 4: Borrow capacity is now inflated to 75% of $180 = 135e18
        uint256 maxBorrowAfter = pool.getBorrowCapacity(attacker);
        assertEq(maxBorrowAfter, 135e18);

        // Step 5: Borrow the extra 60e18
        uint256 extraBorrow = maxBorrowAfter - maxBorrowInitial;
        vm.prank(attacker);
        pool.borrow(extraBorrow);

        // Step 6: Withdraw all collateral (100e18). With the controller off
        // there is no gate at all, so the whole deposit walks out against
        // 135e18 of debt.
        vm.prank(attacker);
        pool.withdraw(COLLATERAL_DEPOSIT);

        // Attacker had 100e18, deposited all 100e18 (balance = 0), then withdrew 100e18
        // So balance = 100e18 (all collateral back)
        uint256 collateralAfter = collateral.balanceOf(attacker);
        assertEq(collateralAfter, COLLATERAL_DEPOSIT,
            "Attacker recovered full collateral deposit - attack succeeded");
    }

    // =====================================================
    // Attack scenario: PROTECTED run
    // =====================================================

    function testAttackBlockedProtected() public {
        _deployController();
        assertTrue(pool.securityControllerEnabled());

        // Steps 1-5 same as unprotected
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        uint256 maxBorrowInitial = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(maxBorrowInitial);

        vm.prank(deployer);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        uint256 maxBorrowAfter = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(maxBorrowAfter - maxBorrowInitial);

        // Step 6: withdraw — PROTECTED
        // The attacker's real position is 100e18 collateral against 135e18 of
        // debt. Withdrawing everything leaves 0 collateral backing that debt,
        // so the controller derives a ratio of 0% and BLOCKS. The attacker
        // supplies nothing but the amount — there is no argument to steer.
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(COLLATERAL_DEPOSIT);

        // Verify attacker still has their collateral in the pool (withdraw was blocked)
        (uint256 collatDeposited, , , ) = pool.getUserState(attacker);
        assertEq(collatDeposited, COLLATERAL_DEPOSIT,
            "Attacker's collateral still in pool after block");
    }

    function testNormalWithdrawAllowed() public {
        _deployController();

        vm.prank(victim);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(victim);
        pool.deposit(COLLATERAL_DEPOSIT);

        uint256 borrowAmt = 30e18;
        vm.prank(victim);
        pool.borrow(borrowAmt);

        // Normal withdraw — the resulting position is 70e18 collateral against
        // 30e18 debt = 233%, comfortably above the 170% review floor → ALLOW.
        uint256 withdrawAmt = 30e18;
        vm.prank(victim);
        pool.withdraw(withdrawAmt);

        (uint256 collatDeposited, , , ) = pool.getUserState(victim);
        assertEq(collatDeposited, COLLATERAL_DEPOSIT - withdrawAmt,
            "Collateral reduced by withdrawal amount");
    }

    // =====================================================
    // Invariant tests
    // =====================================================

    function testInvariantViolatesWhenPriceManipulated() public {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        uint256 honestCollatValue = (COLLATERAL_DEPOSIT * INITIAL_PRICE) / 1e18;
        uint256 simulatedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;

        assertGt(simulatedCollatValue, honestCollatValue,
            "Simulated value exceeds honest value");
    }

    // =====================================================
    // SecurityController direct tests — call through pool
    // =====================================================

    function testControllerAllowsHealthyInvariant() public {
        _deployController();

        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.borrow(50e18);

        // 90e18 collateral against 50e18 debt = 180% >= 170% → Allow
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateWithdraw(attacker, 10e18);
        assertEq(ratioBps, 18000);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Allow));
    }

    function testControllerBlocksViolatedInvariant() public {
        _deployController();

        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.borrow(75e18);

        // 70e18 collateral against 75e18 debt = 93% < 150% → Block
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateWithdraw(attacker, 30e18);
        assertEq(ratioBps, 9333);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Block));
    }

    /// The gate judges the position *after* the withdrawal, not the one that
    /// exists when the call arrives. Here the standing position is fine
    /// (100/65 = 153%) but the withdrawal drops it to 138% → Block.
    function testControllerJudgesPostWithdrawalState() public {
        _deployController();

        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.borrow(65e18);

        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateWithdraw(attacker, 10e18);
        assertEq(ratioBps, 13846);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Block));
    }

    /// The controller refuses to answer anyone but the pool it guards.
    function testControllerRejectsUnprotectedCaller() public {
        _deployController();

        vm.prank(attacker);
        vm.expectRevert(SecurityController.NotProtected.selector);
        controller.evaluateWithdraw(attacker, 1e18);
    }

    function testControllerReviewAtBorderline() public {
        _deployController();

        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.borrow(50e18);

        // 80e18 collateral against 50e18 debt = 160%, between 150% and 170% → Review
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateWithdraw(attacker, 20e18);
        assertEq(ratioBps, 16000);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Review));
    }
}
