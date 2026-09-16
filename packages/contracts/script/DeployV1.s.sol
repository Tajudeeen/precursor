// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";
import { LendingPool } from "../src/LendingPool.sol";

contract DeployV1 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(deployerKey);

        // 1. Deploy Oracle
        MockOracle oracle = new MockOracle();

        // 2. Deploy Collateral (simple ERC20, no constructor args)
        ControlledCollateral collateral = new ControlledCollateral();

        // 3. Deploy LendingPool (needs oracle + collateral)
        //    Pool starts unprotected; we wire the controller after.
        LendingPool pool = new LendingPool(
            address(oracle),
            address(collateral)
        );

        // 4. Deploy SecurityController (needs oracle + collateral + protected pool address)
        //    The controller's policy is set to address(0) for V1 (in-contract policy only).
        SecurityController controller = new SecurityController(
            address(oracle),
            address(collateral),
            address(pool),
            address(0)  // no external policy contract in V1
        );

        // 5. Wire: pool trusts this controller for defense decisions
        pool.setSecurityController(address(controller));

        // 6. Initialize oracle price at $1.00 (1e18, 18 decimals)
        oracle.setPrice(address(collateral), 1e18);

        // Output deployment addresses
        console.log("DEPLOYMENT COMPLETE");
        console.log("MockOracle:          ", address(oracle));
        console.log("ControlledCollateral:", address(collateral));
        console.log("SecurityController:  ", address(controller));
        console.log("LendingPool:         ", address(pool));
        console.log("Initial Price:       1e18 (~$1.00)");

        vm.stopBroadcast();
    }
}
