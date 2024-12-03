require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const SOLANA_RPC_ENDPOINTS = {
    //"mainnet-beta": "https://api.mainnet-beta.solana.com",
   // "chainstack": "https://solana-mainnet.core.chainstack.com/155d8d316c41d2ab16e07ee9190e409c",
   //"publicnode": "https://solana-rpc.publicnode.com/",
   "quiknode-2": "https://virulent-few-dawn.solana-mainnet.quiknode.pro/272b003581d3e1ec81ab5ccf9f7a8008cb0453ec",
   "quiknode-1": "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7",
   "helius": "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f",
   //"tracker": "https://rpc-mainnet.solanatracker.io/?api_key=81b71925-ca06-487c-ac6c-155d8a9e3cda",
   //"syndica": "https://solana-mainnet.api.syndica.io/api-key/4MPquh8r1sBddBwSk6bN3pEHWF241B15QjPVGM5NJCTaetdXSKWyKiGrbw2XtM6YLa6EnYUExb6c5Hras1ocYuUks3YvmtMKDNj",
   //"ligma": "https://public.ligmanode.com",
};

const TPID = new PublicKey(process.env.ProgramID);
function deepEqual(obj1, obj2) {
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return obj1 === obj2;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }
    return true;
}
const connections = {};

async function fetchTokensFromEndpoint(rpc, address, programId) {
    if (!connections[rpc]){
        console.log("creating connection")
        connection = new Connection(rpc, { commitment: 'confirmed' });
        connections[rpc] = connection
    } else {
        connection = connections[rpc]
    }
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
}

async function GetTokens(Address, previousTokens = null) {
    const key = new PublicKey(Address);
    const startTime = Date.now();
    let matchingTokens = null;
    const fetchPromises = Object.entries(SOLANA_RPC_ENDPOINTS).map(([name, rpc]) =>
        fetchTokensFromEndpoint(rpc, key, TPID).catch((error) => {
            console.log(`Error with RPC ${name}:`, error.message);
            return null
        })
    )
    try {
        const tokensList = await Promise.any(fetchPromises);
        if (previousTokens) {
            let skipMatched = false;
            for (let i = 0; i < fetchPromises.length; i++) {
                const tokens = await fetchPromises[i];

                if (tokens && !deepEqual(tokens, previousTokens)) {
                    matchingTokens = tokens;
                    break;
                } else if (tokens && deepEqual(tokens, previousTokens)) {
                    skipMatched = true;
                }
            }
            if (skipMatched && !matchingTokens) {
                matchingTokens = tokensList
            }
        } else {
            matchingTokens = tokensList
        }
        const endTime = Date.now();
        console.log(`Total operation time for GetTokens: ${(endTime - startTime) / 1000}s`);
        return matchingTokens || tokensList
    } catch (errors) {
        const endTime = Date.now();
        console.log(`Total operation time for GetTokens (failed): ${(endTime - startTime) / 1000}s`);
        throw new Error('All RPC endpoints failed to fetch token accounts.');
    }
}
module.exports = GetTokens;