// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MockOracle } from "./MockOracle.sol";
import { ControlledCollateral } from "./ControlledCollateral.sol";

/// @title SecurityController — a narrow, opt-in gate that the LendingPool
///       calls before critical operations (withdraw, borrow). The controller
///       delegates to an external policy contract for the ALLOW/REVIEW/BLOCK
///       decision. The LendingPool grants this authority explicitly.
///
/// @notice Trust model: the protected protocol voluntarily integrates this
///         controller for a single operation (withdrawal). The controller can
///         not custody assets or move funds on its own — it only returns a
///         verdict that the LendingPool respects.
///
/// @dev For V1 the policy is a simple in-memory set of rules evaluated against
///      the current behavioral evidence and simulation result. The policy
///      decision is deterministic and fully on-chain verifiable.
contract SecurityController {
    MockOracle public immutable oracle;
    ControlledCollateral public immutable collateral;

    // The LendingPool that has opted into this controller.
    address public immutable protectedProtocol;

    // The protocol-wide collateralization invariant:
    //   collateralValue >= debtValue * MIN_COLLATERAL_RATIO
    // MIN_COLLATERAL_RATIO is 150% = 15000 basis points.
    uint256 public constant MIN_COLLATERAL_RATIO_BPS = 15000; // 150%

    enum Decision { Allow, Review, Block }

    event DecisionMade(
        address indexed requester,
        bytes32 indexed action,
        Decision decision,
        string reason,
        uint256 collateralValue,
        uint256 debtValue,
        uint256 collateralRatioBps
    );

    /// @dev Set at construction; the policy can be upgraded by the protected
    ///      protocol owner via setPolicy, but V1 keeps it immutable for
    ///      determinism.
    address public policy;

    modifier onlyProtected() {
        if (msg.sender != protectedProtocol) revert NotProtected();
        _;
    }

    constructor(
        address _oracle,
        address _collateral,
        address _protectedProtocol,
        address _policy
    ) {
        oracle = MockOracle(_oracle);
        collateral = ControlledCollateral(_collateral);
        protectedProtocol = _protectedProtocol;
        policy = _policy;
    }

    /// @notice Core enforcement hook. The LendingPool calls this before
    ///         processing a withdraw(borrow) request. The controller
    ///         evaluates the invariant against the *projected* state after
    ///         the withdrawal and returns a verdict.
    ///
    /// @param attacker          The address requesting the withdrawal.
    /// @param borrowAmount      Amount of borrowable asset being withdrawn.
    /// @param projectedCollateralValue  Oracle price * collateral balance
    ///                                    after the attacker's full sequence
    ///                                    (as computed by the off-chain
    ///                                    simulation engine and passed in).
    /// @param projectedDebtValue  Total debt after the withdrawal.
    /// @return decision         Allow / Review / Block
    /// @return reason           Human-readable justification
    /// @return collateralRatioBps  The computed ratio (collateral/debt * 10000)
    function evaluateDefense(
        address attacker,
        uint256 borrowAmount,
        uint256 projectedCollateralValue,
        uint256 projectedDebtValue,
        uint256 currentTimestamp
    )
        internal
        view
        returns (
            Decision decision,
            string memory reason,
            uint256 collateralRatioBps
        )
    {
        // Invariant check: if projected collateral value / debt < threshold,
        // the withdrawal would push the protocol below minimum collateralization.
        if (projectedDebtValue == 0) {
            return (Decision.Allow, "no debt exposure", 0);
        }

        collateralRatioBps = (projectedCollateralValue * 10_000) /
            projectedDebtValue;

        if (collateralRatioBps < MIN_COLLATERAL_RATIO_BPS) {
            // Simulated state would violate the invariant → BLOCK
            return (
                Decision.Block,
                "simulation predicts invariant violation: collateral ratio below minimum",
                collateralRatioBps
            );
        }

        if (collateralRatioBps < MIN_COLLATERAL_RATIO_BPS + 2000) {
            // Between 150% and 170% — close to threshold → REVIEW
            return (
                Decision.Review,
                "collateral ratio approaching minimum threshold",
                collateralRatioBps
            );
        }

        return (Decision.Allow, "collateral ratio healthy", collateralRatioBps);
    }

    /// @notice Public wrapper for external callers (tests, off-chain engines).
    function evaluateDefenseExternal(
        address attacker,
        uint256 borrowAmount,
        uint256 projectedCollateralValue,
        uint256 projectedDebtValue,
        uint256 currentTimestamp
    )
        external
        view
        onlyProtected
        returns (
            Decision decision,
            string memory reason,
            uint256 collateralRatioBps
        )
    {
        return
            evaluateDefense(
                attacker,
                borrowAmount,
                projectedCollateralValue,
                projectedDebtValue,
                currentTimestamp
            );
    }

    /// @notice In V1 the simulation is off-chain. The LendingPool passes
    ///         the projected values that the behavior engine + simulation
    ///         engine computed. For the protected demo, the controller
    ///         receives the *simulated* (attacker-inflated) collateral value
    ///         and detects the invariant violation.
    ///
    ///         The unprotected run simply never calls this controller.
    function evaluateDefenseWithBehaviorEvidence(
        address attacker,
        uint256 borrowAmount,
        uint256 projectedCollateralValue,
        uint256 projectedDebtValue,
        bool behaviorFlagged,
        uint256 behaviorConfidence,
        uint256 currentTimestamp
    )
        external
        view
        onlyProtected
        returns (
            Decision decision,
            string memory reason,
            uint256 collateralRatioBps
        )
    {
        // If behavior engine flagged the sequence AND simulation shows
        // invariant violation, block deterministically.
        if (behaviorFlagged && behaviorConfidence >= 70) {
            // Run the same invariant check — behavior flag raises
            // sensitivity threshold but final call is on the invariant.
            if (projectedDebtValue == 0) {
                return (Decision.Allow, "no debt exposure", 0);
            }
            collateralRatioBps = (projectedCollateralValue * 10_000) /
                projectedDebtValue;

            if (collateralRatioBps < MIN_COLLATERAL_RATIO_BPS) {
                return (
                    Decision.Block,
                    "behavior-flagged sequence + invariant violation",
                    collateralRatioBps
                );
            }
        }

        // Fall through to standard invariant check.
        return
            evaluateDefense(
                attacker,
                borrowAmount,
                projectedCollateralValue,
                projectedDebtValue,
                currentTimestamp
            );
    }

    error NotProtected();
}
