# Production Deployment Checklist

Use this checklist before deploying Precursor to any non-local environment.

## 1. Environment and secrets
- [ ] Copy `.env.example` to a real deployment environment file and fill in actual values.
- [ ] Set `NODE_ENV=production`.
- [ ] Set a strong `PRECURSOR_API_KEY` value and rotate it before production exposure.
- [ ] Set `RPC_URL`, `CHAIN_ID`, `LENDING_POOL`, `ORACLE`, `COLLATERAL`, and `SECURITY_CONTROLLER` explicitly.
- [ ] Never commit `.env`, `.env.local`, or production secrets to source control.
- [ ] Ensure `DEPLOYER_KEY` and `ATTACKER_KEY` are only used in non-production or ephemeral test environments.
- [ ] Verify no fallback private keys remain in runtime code.

## 2. Contract deployment
- [ ] Deploy to the intended chain and confirm the correct chain ID.
- [ ] Confirm `SecurityController` is installed before enabling protected flows.
- [ ] Confirm `LendingPool` references the right controller address.
- [ ] Validate that protocol owner/admin addresses are correct and restricted.
- [ ] Validate `onlyOwner` style protections on critical methods.
- [ ] Check the contract addresses in the deployment environment match the live configuration.

## 3. API hardening
- [ ] API is behind trusted infrastructure or auth layer if public.
- [ ] `X-Precursor-Key` is configured with the correct runtime secret.
- [ ] Protected routes are inaccessible without the header.
- [ ] No write endpoints are left exposed without authorization.
- [ ] Logging does not print secrets or private keys.
- [ ] Health endpoints are operational, but write endpoints remain protected.

## 4. Runtime readiness
- [ ] `forge` is installed and available in PATH for the chosen environment.
- [ ] Anvil or the target blockchain RPC is reachable.
- [ ] The app starts successfully in production mode.
- [ ] Health endpoint responds without errors.
- [ ] Monitoring and alerting are configured for the API and blockchain RPC health.

## 5. Verification
- [ ] Run `npm run verify` in a clean environment.
- [ ] Confirm all 4 gates pass: typecheck, tests, contract tests, build.
- [ ] Confirm environment configuration is valid before exposing the API publicly.
- [ ] Record the deployment commit SHA and verification output.

## 6. Post-deploy sanity checks
- [ ] Check that `/api/health` responds with HTTP 200.
- [ ] Check that protected write routes return 401/403 without the API key.
- [ ] Verify the security controller is enabled after startup.
- [ ] Verify the protocol addresses displayed by `/api/protocol` match deployment values.
- [ ] Confirm there are no unsupported default contract addresses in production.
