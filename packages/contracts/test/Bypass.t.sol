// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { LendingPool } from "../src/LendingPool.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";

/// @notice Bypass regression suite for audit findings C-1 and C-2.
///
///         Written first as failing tests against the vulnerable build, kept as
///         the regression guard for the fix.
///
///         C-1: LendingPool.withdraw() used to accept projectedCollateralValue,
///              projectedDebtValue, behaviorFlagged and behaviorConfidence as
///              caller-supplied arguments, and SecurityController did its
///              arithmetic on those numbers without ever reading chain state —
///              so the attacker chose the verdict. The signature now takes only
///              an amount, and the controller derives collateral, debt and price
///              from the chain. The four old arguments cannot be passed at all:
///              a call site that tries will not compile, which is a stronger
///              guarantee than any assertion in this file.
///
///         C-2: MockOracle.setPrice and ControlledCollateral.mint were
///              permissionless, so anyone could move the price the pool values
///              collateral with, or mint themselves unlimited collateral. Both
///              are now owner-only.
contract BypassTest is Test {
    MockOracle           oracle;
    ControlledCollateral collateral;
    LendingPool          pool;
    SecurityController   controller;

    address internal attacker;
    address internal deployer;

    uint256 internal constant INITIAL_PRICE       = 1e18;   // $1.00
    uint256 internal constant INFLATED_PRICE      = 18e17;  // $1.80
    uint256 internal constant DEVALUED_PRICE      = 6e17;   // $0.60
    uint256 internal constant COLLATERAL_DEPOSIT  = 100e18;

    function setUp() public {
        deployer = address(100);
        attacker = address(200);

        vm.deal(deployer, 10000 ether);
        vm.deal(attacker, 10000 ether);

        vm.startPrank(deployer);
        oracle     = new MockOracle();
        collateral = new ControlledCollateral();
        pool       = new LendingPool(address(oracle), address(collateral));

        oracle.setDecimals(address(collateral), 18);
        oracle.setPrice(address(collateral), INITIAL_PRICE);

        collateral.mint(attacker, COLLATERAL_DEPOSIT);

        // Controller armed for every test in this suite.
        controller = new SecurityController(
            address(oracle),
            address(collateral),
            address(pool),
            address(0)
        );
        pool.setSecurityController(address(controller));
        vm.stopPrank();
    }

    /// @dev Deposit `COLLATERAL_DEPOSIT` and borrow `borrowAmount` as the attacker.
    function _openPosition(uint256 borrowAmount) internal {
        vm.prank(attacker);
        collateral.approve(address(pool), COLLATERAL_DEPOSIT);
        vm.prank(attacker);
        pool.deposit(COLLATERAL_DEPOSIT);

        if (borrowAmount > 0) {
            vm.prank(attacker);
            pool.borrow(borrowAmount);
        }
    }

    /// @dev The oracle owner moves the price, standing in for a manipulated feed.
    function _movePrice(uint256 newPrice) internal {
        vm.prank(deployer);
        oracle.setPrice(address(collateral), newPrice);
    }

    // =====================================================
    // C-1 — the verdict comes from chain state, not from the caller
    // =====================================================

    /// The attacker holds 75e18 of real debt and asks to withdraw everything.
    /// There is no argument left to declare the debt away: the controller reads
    /// userDebt() from the pool and sees 0 collateral backing 75e18 of debt.
    function testWithdrawCannotBypassWithRealDebtOutstanding() public {
        _openPosition(75e18);

        assertEq(pool.userDebt(attacker), 75e18, "precondition: attacker carries real debt");

        vm.prank(attacker);
        vm.expectRevert();
        pool.withdraw(COLLATERAL_DEPOSIT);
    }

    /// The price is read live rather than taken on the caller's word. At the
    /// honest $1.00 this position is healthy; at $0.60 the same withdrawal
    /// leaves 54e18 of collateral value against 60e18 of debt = 90%, and the
    /// gate blocks it. A caller claiming "my collateral is worth $100" gets
    /// nowhere, because the caller supplies no valuation at all.
    function testWithdrawalJudgedAgainstLivePriceNotCallerClaim() public {
        _openPosition(60e18);

        _movePrice(DEVALUED_PRICE);

        vm.prank(attacker);
        vm.expectRevert();
        pool.withdraw(10e18);
    }

    /// Skimming just under the ratio rather than emptying the position. The
    /// gate evaluates the resulting position, so the size of the withdrawal
    /// does not provide cover.
    function testSkimmingJustUnderTheRatioIsBlocked() public {
        _openPosition(66e18);

        // 95e18 collateral against 66e18 debt = 143% < 150%
        vm.prank(attacker);
        vm.expectRevert();
        pool.withdraw(5e18);
    }

    /// The headline case: the full oracle-manipulation sequence the product
    /// exists to stop. Every step is real chain state — the attacker's only
    /// input at the final step is the amount.
    function testFullAttackSequenceIsBlocked() public {
        // 1-2. Deposit 100e18, borrow max at $1.00 (= 75e18).
        _openPosition(0);
        uint256 capAtFairPrice = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(capAtFairPrice);

        // 3. The feed moves to $1.80.
        _movePrice(INFLATED_PRICE);

        // 4. Borrow the phantom capacity the inflated price unlocked.
        uint256 capAtInflatedPrice = pool.getBorrowCapacity(attacker);
        vm.prank(attacker);
        pool.borrow(capAtInflatedPrice - capAtFairPrice);
        assertEq(pool.userDebt(attacker), 135e18, "precondition: 135e18 debt outstanding");

        uint256 poolBalanceBefore = collateral.balanceOf(address(pool));

        // 5. Withdraw everything.
        vm.prank(attacker);
        vm.expectRevert();
        pool.withdraw(COLLATERAL_DEPOSIT);

        // The pool must not have lost collateral to a position with open debt.
        assertEq(
            collateral.balanceOf(address(pool)),
            poolBalanceBefore,
            "pool drained: collateral left the protocol against 135e18 of unbacked debt"
        );
        assertEq(
            pool.userCollateral(attacker),
            COLLATERAL_DEPOSIT,
            "attacker's collateral should still be held by the pool"
        );
    }

    /// The gate is not a blanket block. A position that stays healthy after the
    /// withdrawal must still go through — deposit 100, borrow 30, withdraw 30
    /// leaves 70 against 30.
    function testHealthyWithdrawalStillAllowed() public {
        _openPosition(30e18);

        vm.prank(attacker);
        pool.withdraw(30e18);

        assertEq(pool.userCollateral(attacker), COLLATERAL_DEPOSIT - 30e18);
        assertGe(collateral.balanceOf(attacker), 30e18);
    }

    // =====================================================
    // C-2 — mock privileges are owner-only
    // =====================================================

    /// MockOracle.setPrice is owner-only, so an arbitrary address cannot move
    /// the price the LendingPool values collateral with.
    function testUnauthorizedCannotSetPrice() public {
        uint256 priceBefore = oracle.getPrice(address(collateral));

        vm.prank(attacker);
        vm.expectRevert();
        oracle.setPrice(address(collateral), INFLATED_PRICE);

        assertEq(
            oracle.getPrice(address(collateral)),
            priceBefore,
            "price must be unchanged after an unauthorized set attempt"
        );
    }

    /// ControlledCollateral.mint is owner-only, so no address can conjure
    /// itself unlimited collateral.
    function testUnauthorizedCannotMint() public {
        vm.prank(attacker);
        vm.expectRevert();
        collateral.mint(attacker, 1_000_000e18);

        assertEq(
            collateral.totalSupply(),
            COLLATERAL_DEPOSIT,
            "supply must be unchanged after an unauthorized mint attempt"
        );
    }

    // =====================================================
    // Privileged setters on the pool itself
    // =====================================================

    /// docs/AUDIT_REPORT.md FINDING-01 claims this test was added as proof of
    /// fix. It was never written. The `onlyOwner` modifier it describes is
    /// genuinely present, so this closes the documentation gap.
    function testUnauthorizedCannotDisableSecurityController() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        pool.disableSecurityController();

        assertTrue(
            pool.securityControllerEnabled(),
            "controller must remain armed after an unauthorized disable attempt"
        );
    }

    /// Companion guard for setSecurityController (FINDING-02).
    function testUnauthorizedCannotSetSecurityController() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        pool.setSecurityController(address(0xdead));

        assertEq(
            address(pool.securityController()),
            address(controller),
            "controller address must be unchanged after an unauthorized set attempt"
        );
    }
}
