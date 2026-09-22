// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";
import { LendingPool } from "../src/LendingPool.sol";

/// @title DeployScript — deploys the V1 stack and prints the addresses in the
///        KEY=value form the TS tooling consumes (LENDING_POOL, ORACLE,
///        COLLATERAL, SECURITY_CONTROLLER).
///
/// @dev Every contract is deployed from DEPLOYER_KEY, so that account ends up
///      as owner of the pool, the oracle and the collateral token — which is
///      what the attacker scripts rely on when they move the price.
///
///      DeployV1.s.sol deploys the same stack; keep the two in step or drop
///      one of them.
contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy in dependency order
        MockOracle oracle = new MockOracle();
        ControlledCollateral collateral = new ControlledCollateral();

        LendingPool pool = new LendingPool(
            address(oracle),
            address(collateral)
        );

        SecurityController controller = new SecurityController(
            address(oracle),
            address(collateral),
            address(pool),
            address(0) // no external policy contract in V1
        );

        // Opt the pool into the controller, then seed the collateral price.
        pool.setSecurityController(address(controller));
        oracle.setPrice(address(collateral), 1e18);

        vm.stopBroadcast();

        // Output deployment addresses for TS tooling
        console.log("ORACLE=%s", address(oracle));
        console.log("COLLATERAL=%s", address(collateral));
        console.log("SECURITY_CONTROLLER=%s", address(controller));
        console.log("LENDING_POOL=%s", address(pool));
    }
}
