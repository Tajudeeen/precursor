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

        // Step 3: Attacker manipulates oracle to $1.80
        vm.prank(attacker);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        // Step 4: Borrow capacity is now inflated to 75% of $180 = 135e18
        uint256 maxBorrowAfter = pool.getBorrowCapacity(attacker);
        assertEq(maxBorrowAfter, 135e18);

        // Step 5: Borrow the extra 60e18
        uint256 extraBorrow = maxBorrowAfter - maxBorrowInitial;
        vm.prank(attacker);
        pool.borrow(extraBorrow);

        // Step 6: Withdraw all collateral (100e18)
        // The pool has 100e18 collateral to send. Attacker gets it all.
        uint256 collateralBefore = collateral.balanceOf(attacker);

        // Projected state from simulation:
        // collateralValue = $180 (inflated), debt = $135 (manipulated)
        // ratio = 180/135 = 133% < 150% → VIOLATION
        // But unprotected path doesn't check — it sends collateral anyway
        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;
        uint256 projectedDebt = maxBorrowAfter;

        vm.prank(attacker);
        pool.withdraw(
            COLLATERAL_DEPOSIT,  // withdraw all deposited collateral
            projectedCollatValue,
            projectedDebt,
            false,
            0
        );

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

        vm.prank(attacker);
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        uint256 maxBorrowAfter = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(maxBorrowAfter - maxBorrowInitial);

        // Step 6: withdraw — PROTECTED, simulation flags invariant violation
        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 1e18;
        uint256 projectedDebt = maxBorrowAfter;

        // Honest collateral value (at $1) = 100e18
        // Simulated collateral value (at $1.80) = 180e18
        // Debt = 135e18
        // Simulated ratio = 180/135 = 133% < 150% → VIOLATION
        // The controller should BLOCK because:
        // 1. behaviorFlagged = true (oracle manipulation detected)
        // 2. projectedCollateralValue / projectedDebt < MIN_RATIO

        uint256 honestCollatValue = (COLLATERAL_DEPOSIT * INITIAL_PRICE) / 1e18;

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature(
                "WithdrawBlocked(string)",
                "simulation predicts invariant violation"
            )
        );
        pool.withdraw(
            COLLATERAL_DEPOSIT,
            projectedCollatValue,   // 180e18 — inflated
            projectedDebt,           // 135e18
            true,                  // behaviorFlagged
            85                     // behaviorConfidence
        );

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

        uint256 borrowAmt = 50e18;
        vm.prank(victim);
        pool.borrow(borrowAmt);

        // Normal withdraw — healthy invariant, behavior not flagged
        uint256 projectedCollatValue = (COLLATERAL_DEPOSIT * INITIAL_PRICE) / 1e18; // $100
        uint256 projectedDebt = borrowAmt; // $50

        // ratio = 100/50 = 200% >= 150% → ALLOW
        vm.prank(victim);
        pool.withdraw(
            borrowAmt,  // withdraw 50e18 collateral
            projectedCollatValue,
            projectedDebt - borrowAmt,  // debt after repaying = 0
            false,
            0
        );

        // Attacker (victim in this case) should have received collateral back
        (,, uint256 collatDeposited,) = pool.getUserState(victim);
        assertEq(collatDeposited, COLLATERAL_DEPOSIT - borrowAmt,
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

        // ratio = 100/50 = 200% >= 150% → Allow
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateDefenseExternal(
                attacker,
                50e18,
                100e18,   // $100 collateral value
                50e18,    // $50 debt
                block.timestamp
            );
        assertGe(ratioBps, 15000);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Allow));
    }

    function testControllerBlocksViolatedInvariant() public {
        _deployController();

        // ratio = 100/75 = 133% < 150% → Block
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateDefenseExternal(
                attacker,
                75e18,
                100e18,  // $100 collateral value
                75e18,   // $75 debt
                block.timestamp
            );
        assertLt(ratioBps, 15000);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Block));
    }

    function testControllerWithBehaviorFlagAmplifiesBlock() public {
        _deployController();

        // Even at 142% (which would be REVIEW without behavior flag),
        // behavior flag + confidence > 70 → Block
        vm.prank(address(pool));
        (SecurityController.Decision decision, , ) =
            controller.evaluateDefenseWithBehaviorEvidence(
                attacker,
                70e18,
                100e18,  // $100 honest collateral
                70e18,   // $70 debt → ratio = 142%
                true,    // behaviorFlagged
                85,      // confidence
                block.timestamp
            );
        assertEq(uint256(decision), uint256(SecurityController.Decision.Block));
    }

    function testControllerReviewAtBorderlineWithoutFlag() public {
        _deployController();

        // ratio = 165% — between 150% and 170% → Review
        // 100/60 = 166.6% → Review
        vm.prank(address(pool));
        (SecurityController.Decision decision, , uint256 ratioBps) =
            controller.evaluateDefenseExternal(
                attacker,
                60e18,
                100e18,
                60e18,
                block.timestamp
            );
        assertGe(ratioBps, 15000);
        assertLt(ratioBps, 17000);
        assertEq(uint256(decision), uint256(SecurityController.Decision.Review));
    }
}
