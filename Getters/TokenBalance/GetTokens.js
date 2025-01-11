require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');


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

async function fetchTokensFromEndpoint(connection, address, programId) {
    const response = await connection.getParsedTokenAccountsByOwner(address, { programId });
    const tokens = {};

    response.value.forEach((keyedAccount) => {
        const parsedInfo = keyedAccount.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const tokenAmountInfo = parsedInfo.tokenAmount;
        const tokenAmount = parseFloat(tokenAmountInfo.uiAmountString);
        if (tokenAmount){
            tokens[mint] = tokenAmount;
        }
    });

    return tokens;
}

async function GetTokens(Address, previousTokens = null, SOLANA_RPC_ENDPOINTS) {
    const key = new PublicKey(Address);
    const startTime = Date.now();
    let matchingTokens = null;
    const fetchPromises = SOLANA_RPC_ENDPOINTS.map((connection, index) =>
        fetchTokensFromEndpoint(connection, key, TPID).catch((error) => {
            console.log(`Error with RPC connection ${index}:`, error.message);
            return null;
        })
    );
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