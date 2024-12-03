require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const SOLANA_RPC_ENDPOINTS = {
    "quiknode-2": "https://virulent-few-dawn.solana-mainnet.quiknode.pro/272b003581d3e1ec81ab5ccf9f7a8008cb0453ec",
    "quiknode-1": "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7",
    "helius": "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f",
};

const TPID = new PublicKey(process.env.ProgramID);

// Function to compare two objects deeply
function deepEqual(obj1, obj2) {
    // ... (same as before)
}

// Create a connections dictionary to store and reuse Connection instances
const connections = {};
const connectionPromises = {}; // To track connection initialization

for (const [name, rpc] of Object.entries(SOLANA_RPC_ENDPOINTS)) {
    connectionPromises[name] = new Promise((resolve, reject) => {
        const connection = new Connection(rpc, { commitment: 'confirmed' });
        // Optionally, perform an initial request to ensure the connection is ready
        connection.getVersion()
            .then(() => {
                connections[name] = connection;
                resolve();
            })
            .catch((error) => {
                console.log(`Error initializing connection to ${name}:`, error.message);
                reject(error);
            });
    });
}

async function fetchTokensFromEndpoint(name, address, programId) {
    try {
        // Wait for the connection to be ready
        await connectionPromises[name];
        const connection = connections[name];
        const response = await connection.getParsedTokenAccountsByOwner(address, { programId });
        const tokens = {};

        response.value.forEach((keyedAccount) => {
            const parsedInfo = keyedAccount.account.data.parsed.info;
            const mint = parsedInfo.mint;
            const tokenAmountInfo = parsedInfo.tokenAmount;
            const tokenAmount = parseFloat(tokenAmountInfo.uiAmountString);
            if (tokenAmount) {
                tokens[mint] = tokenAmount;
            }
        });

        return tokens;
    } catch (error) {
        console.log(`Error fetching tokens from ${name}:`, error.message);
        return null;
    }
}

async function GetTokens(Address, previousTokens = null) {
    const key = new PublicKey(Address);
    const startTime = Date.now();

    try {
        // Wait for all connections to be initialized
        await Promise.allSettled(Object.values(connectionPromises));

        const fetchPromises = Object.keys(SOLANA_RPC_ENDPOINTS).map((name) =>
            fetchTokensFromEndpoint(name, key, TPID)
        );

        const settledResults = await Promise.allSettled(fetchPromises);

        let matchingTokens = null;
        for (const result of settledResults) {
            if (result.status === 'fulfilled' && result.value) {
                const tokens = result.value;
                if (previousTokens && !deepEqual(tokens, previousTokens)) {
                    matchingTokens = tokens;
                    break;
                } else if (!previousTokens) {
                    matchingTokens = tokens;
                    break;
                }
            }
        }

        const endTime = Date.now();
        console.log(`Total operation time for GetTokens: ${(endTime - startTime) / 1000}s`);

        if (matchingTokens) {
            return matchingTokens;
        } else {
            throw new Error('All RPC endpoints failed to fetch token accounts.');
        }
    } catch (error) {
        const endTime = Date.now();
        console.log(`Total operation time for GetTokens (failed): ${(endTime - startTime) / 1000}s`);
        throw error;
    }
}

module.exports = GetTokens;
