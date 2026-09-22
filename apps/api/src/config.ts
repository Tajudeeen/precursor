export interface RuntimeConfig {
    nodeEnv: string;
    rpcUrl: string;
    chainId: number;
    adminApiKey?: string;
    contractAddresses: {
        lendingPool: `0x${string}`;
        oracle: `0x${string}`;
        collateral: `0x${string}`;
        securityController: `0x${string}`;
    };
}

const DEFAULT_CONTRACTS = {
    lendingPool: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    oracle: '0x0000000000000000000000000000000000000002' as `0x${string}`,
    collateral: '0x0000000000000000000000000000000000000003' as `0x${string}`,
    securityController: '0x0000000000000000000000000000000000000004' as `0x${string}`,
};

export function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
    const value = env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
    const nodeEnv = env.NODE_ENV ?? 'development';
    const rpcUrl = env.RPC_URL ?? 'http://127.0.0.1:8555';
    const chainId = Number(env.CHAIN_ID ?? '31337');
    const adminApiKey = env.PRECURSOR_API_KEY?.trim();

    if (nodeEnv === 'production' && !adminApiKey) {
        throw new Error('Production requires PRECURSOR_API_KEY to be set explicitly.');
    }

    const contractAddresses = {
        lendingPool: (env.LENDING_POOL ?? DEFAULT_CONTRACTS.lendingPool) as `0x${string}`,
        oracle: (env.ORACLE ?? DEFAULT_CONTRACTS.oracle) as `0x${string}`,
        collateral: (env.COLLATERAL ?? DEFAULT_CONTRACTS.collateral) as `0x${string}`,
        securityController: (env.SECURITY_CONTROLLER ?? DEFAULT_CONTRACTS.securityController) as `0x${string}`,
    };

    if (nodeEnv === 'production') {
        readRequiredEnv(env, 'RPC_URL');
        readRequiredEnv(env, 'LENDING_POOL');
        readRequiredEnv(env, 'ORACLE');
        readRequiredEnv(env, 'COLLATERAL');
        readRequiredEnv(env, 'SECURITY_CONTROLLER');
    }

    return {
        nodeEnv,
        rpcUrl,
        chainId,
        adminApiKey,
        contractAddresses,
    };
}
