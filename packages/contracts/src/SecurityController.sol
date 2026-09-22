// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MockOracle } from "./MockOracle.sol";
import { ControlledCollateral } from "./ControlledCollateral.sol";

/// @dev The minimal view surface the controller needs from the protocol it
///      guards. Every value the verdict depends on is read from here — never
///      from the caller's arguments.
interface IProtectedLendingPool {
    function userDebt(address user) external view returns (uint256);

    function userCollateral(address user) external view returns (uint256);
}

/// @title SecurityController — a narrow, opt-in gate that the LendingPool
///       calls before critical operations (withdraw, borrow). The controller
///       holds the ALLOW/REVIEW/BLOCK policy itself and reads the state it
///       judges from the chain. The LendingPool grants this authority
///       explicitly and is the only address allowed to ask for a verdict.
///
/// @notice Trust model: the protected protocol voluntarily integrates this
///         controller for a single operation (withdrawal). The controller can
///         not custody assets or move funds on its own — it only returns a
///         verdict that the LendingPool respects.
///
/// @dev The caller supplies exactly two things: *who* is withdrawing and *how
///      much*. Everything the decision depends on — the caller's collateral
///      balance, their debt, and the collateral price — is read from
///      `protectedProtocol` and `oracle` inside this contract. There is no
///      parameter a caller can set to steer the verdict.
contract SecurityController {
    MockOracle public immutable oracle;
    ControlledCollateral public immutable collateral;

    // The LendingPool that has opted into this controller.
    address public immutable protectedProtocol;

    // The protocol-wide collateralization invariant:
    //   remainingCollateralValue >= debtValue * MIN_COLLATERAL_RATIO
    // MIN_COLLATERAL_RATIO is 150% = 15000 basis points.
    uint256 public constant MIN_COLLATERAL_RATIO_BPS = 15000; // 150%

    // Withdrawals landing between MIN and MIN + REVIEW_BAND are close enough to
    // the threshold to warrant a human look rather than a silent pass.
    uint256 public constant REVIEW_BAND_BPS = 2000; // 150% .. 170%

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
        if (_protectedProtocol == address(0)) revert NotProtected();
        oracle = MockOracle(_oracle);
        collateral = ControlledCollateral(_collateral);
        protectedProtocol = _protectedProtocol;
        policy = _policy;
    }

    /// @notice Core enforcement hook. The LendingPool calls this before
    ///         processing a withdrawal. The controller derives the
    ///         post-withdrawal position from live chain state and evaluates
    ///         the collateralization invariant against it.
    ///
    /// @param user           The address whose collateral is leaving.
    /// @param withdrawAmount Amount of collateral tokens being withdrawn.
    /// @return decision     Allow / Review / Block
    /// @return reason       Human-readable justification
    /// @return collateralRatioBps  The computed ratio (collateral/debt * 10000)
    function evaluateWithdraw(
        address user,
        uint256 withdrawAmount
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
        IProtectedLendingPool pool = IProtectedLendingPool(protectedProtocol);

        uint256 heldCollateral = pool.userCollateral(user);
        uint256 debt = pool.userDebt(user);
        uint256 price = oracle.getPrice(address(collateral));

        // The pool checks this before calling, but a gate must not depend on
        // its caller having done so.
        if (withdrawAmount > heldCollateral) {
            return (
                Decision.Block,
                "withdrawal exceeds on-chain collateral balance",
                0
            );
        }

        uint256 remainingValue = ((heldCollateral - withdrawAmount) * price) /
            1e18;

        // Nothing owed → nothing to under-collateralize.
        if (debt == 0) {
            return (Decision.Allow, "no debt exposure", 0);
        }

        collateralRatioBps = (remainingValue * 10_000) / debt;

        if (collateralRatioBps < MIN_COLLATERAL_RATIO_BPS) {
            return (
                Decision.Block,
                "post-withdrawal collateral ratio below minimum",
                collateralRatioBps
            );
        }

        if (collateralRatioBps < MIN_COLLATERAL_RATIO_BPS + REVIEW_BAND_BPS) {
            return (
                Decision.Review,
                "collateral ratio approaching minimum threshold",
                collateralRatioBps
            );
        }

        return (Decision.Allow, "collateral ratio healthy", collateralRatioBps);
    }

    error NotProtected();
}
