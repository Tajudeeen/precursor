// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { LendingPool } from "../src/LendingPool.sol";

/// @title AttackScenarioRunner - executes the oracle manipulation attack on Anvil.
///         The withdrawal step is expected to revert (defense works!),
///         but we catch it so the rest of the broadcast succeeds.
///
/// Usage:
///   forge script script/AttackScenarioRunner.s.sol:AttackScenarioRunner
///     --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast
contract AttackScenarioRunner is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address poolAddr = vm.envAddress("LENDING_POOL");
        address oracleAddr = vm.envAddress("ORACLE");
        address collateralAddr = vm.envAddress("COLLATERAL");

        address attacker = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        console.log("=== ATTACK SCENARIO: ORACLE_MANIPULATION_001 ===");
        console.log("Attacker:", attacker);

        MockOracle oracle = MockOracle(oracleAddr);
        ControlledCollateral collateral = ControlledCollateral(collateralAddr);
        LendingPool pool = LendingPool(poolAddr);

        // 1. Mint 1000 collateral to attacker
        console.log("1. Minting 1000 collateral...");
        collateral.mint(attacker, 1000 ether);
        console.log("   Done");

        // 2. Approve pool
        console.log("2. Approving pool...");
        collateral.approve(address(pool), 1000 ether);
        console.log("   Done");

        // 3. Deposit 100 collateral ($100 at $1)
        console.log("3. Depositing 100 collateral...");
        pool.deposit(100 ether);
        console.log("   Done");

        // 4. Borrow 75 (max at $1)
        console.log("4. Borrowing 75...");
        pool.borrow(75 ether);
        console.log("   Done");

        // 5. Manipulate oracle to $1.80
        console.log("5. Setting oracle price to $1.80...");
        oracle.setPrice(address(collateral), 1.8e18);
        console.log("   Done");

        // 6. Borrow 60 more (total debt = 135, max at $1.80)
        console.log("6. Borrowing 60 more...");
        pool.borrow(60 ether);
        console.log("   Done - total debt = 135");

        // 7. Attempt withdrawal — EXPECTED TO REVERT (defense works)
        console.log("7. Attempting withdrawal (expected: BLOCKED)...");
        // Use low-level call to catch the revert without failing the broadcast.
        // withdraw() takes only an amount: the controller derives the position
        // from chain state, so there is no argument that could flatter it.
        bytes memory withdrawData = abi.encodeWithSelector(
            pool.withdraw.selector,
            100 ether        // withdrawAmount
        );
        (bool success, ) = address(pool).call(withdrawData);
        if (!success) {
            console.log("   Withdrawal BLOCKED (reverted as expected)");
        } else {
            console.log("   UNEXPECTED: Withdrawal succeeded!");
        }

        vm.stopBroadcast();
        console.log("=== SCENARIO COMPLETE ===");
    }
}
