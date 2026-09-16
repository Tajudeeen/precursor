// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { MockOracle } from "../src/MockOracle.sol";
import { ControlledCollateral } from "../src/ControlledCollateral.sol";
import { SecurityController } from "../src/SecurityController.sol";
import { LendingPool } from "../src/LendingPool.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy in dependency order
        MockOracle oracle = new MockOracle();
        ControlledCollateral collateral = new ControlledCollateral("USD Coin", "USDC", 6, address(oracle));
        SecurityController controller = new SecurityController(address(oracle), address(collateral));
        LendingPool pool = new LendingPool(
            address(oracle),
            address(collateral),
            address(controller),
            15000  // MIN_COLLATERAL_RATIO_BPS = 150%
        );

        // Set the controller on the pool
        pool.setSecurityController(address(controller));
        controller.setProtectedProtocol(address(pool));

        // Output deployment addresses for TS tooling
        emit log_named_address("ORACLE", address(oracle));
        emit log_named_address("COLLATERAL", address(collateral));
        emit log_named_address("SECURITY_CONTROLLER", address(controller));
        emit log_named_address("LENDING_POOL", address(pool));

        vm.stopBroadcast();
    }
}
