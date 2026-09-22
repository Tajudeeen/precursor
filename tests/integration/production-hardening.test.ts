import { describe, expect, it } from 'vitest';

import { getRuntimeConfig, readRequiredEnv } from '../../apps/api/src/config';

describe('production configuration hardening', () => {
    it('requires explicit API secret in production', () => {
        expect(() => readRequiredEnv({ NODE_ENV: 'production' }, 'PRECURSOR_API_KEY')).toThrow(/PRECURSOR_API_KEY/);
    });

    it('accepts explicit environment values for production startup', () => {
        const config = getRuntimeConfig({
            NODE_ENV: 'production',
            RPC_URL: 'http://127.0.0.1:8555',
            CHAIN_ID: '31337',
            LENDING_POOL: '0x1111111111111111111111111111111111111111',
            ORACLE: '0x2222222222222222222222222222222222222222',
            COLLATERAL: '0x3333333333333333333333333333333333333333',
            SECURITY_CONTROLLER: '0x4444444444444444444444444444444444444444',
            PRECURSOR_API_KEY: 'test-secret',
        });

        expect(config.rpcUrl).toBe('http://127.0.0.1:8555');
        expect(config.contractAddresses.lendingPool).toBe('0x1111111111111111111111111111111111111111');
        expect(config.adminApiKey).toBe('test-secret');
    });
});
