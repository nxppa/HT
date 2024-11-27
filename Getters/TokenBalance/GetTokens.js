require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const SOLANA_RPC_ENDPOINTS = {
    //"mainnet-beta": "https://api.mainnet-beta.solana.com",
    "chainstack": "https://solana-mainnet.core.chainstack.com/155d8d316c41d2ab16e07ee9190e409c",
    "helius": "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f",
    "quiknode-1": "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7",
    "tracker": "https://rpc-mainnet.solanatracker.io/?api_key=81b71925-ca06-487c-ac6c-155d8a9e3cda",
    "publicnode": "https://solana-rpc.publicnode.com/",
    "syndica": "https://solana-mainnet.api.syndica.io/api-key/4MPquh8r1sBddBwSk6bN3pEHWF241B15QjPVGM5NJCTaetdXSKWyKiGrbw2XtM6YLa6EnYUExb6c5Hras1ocYuUks3YvmtMKDNj",
    "quiknode-2": "https://virulent-few-dawn.solana-mainnet.quiknode.pro/272b003581d3e1ec81ab5ccf9f7a8008cb0453ec",
};

const TPID = new PublicKey(process.env.ProgramID);

async function fetchTokensFromEndpoint(rpc, address, programId) {
    const connection = new Connection(rpc, {
        commitment: 'confirmed',
    });

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

    // Create an array of promises from the dictionary of endpoints
    const fetchPromises = Object.entries(SOLANA_RPC_ENDPOINTS).map(([name, rpc]) =>
        fetchTokensFromEndpoint(rpc, key, TPID).catch((error) => {
            console.error(`Error with RPC ${name}:`, error.message);
            return null; // Return null on failure to avoid rejecting the entire Promise.any
        })
    );

    try {
        // Use Promise.any to resolve as soon as the first successful response is received
        const tokensList = await Promise.any(fetchPromises);

        // If previousTokens is provided, compare each result with previousTokens
        if (previousTokens) {
            // Loop through the tokensList to check if any match previousTokens
            let skipMatched = false;

            for (let i = 0; i < tokensList.length; i++) {
                if (tokensList[i] && JSON.stringify(tokensList[i]) !== JSON.stringify(previousTokens)) {
                    matchingTokens = tokensList[i];
                    break;
                } else if (tokensList[i] && JSON.stringify(tokensList[i]) === JSON.stringify(previousTokens)) {
                    // If tokens match, skip it and try another one
                    skipMatched = true;
                }
            }

            // If all RPC calls matched the previousTokens, return the last one
            if (skipMatched && !matchingTokens) {
                matchingTokens = tokensList[tokensList.length - 1];
            }
        } else {
            matchingTokens = tokensList.find((tokens) => tokens !== null); // Just return the first valid response
        }

        const endTime = Date.now();
        console.log(`Total operation time for GetTokens: ${(endTime - startTime) / 1000}s`);
        return matchingTokens || tokensList[tokensList.length - 1]; // If no matching found, return the last one

    } catch (errors) {
        const endTime = Date.now();
        console.log(`Total operation time for GetTokens (failed): ${(endTime - startTime) / 1000}s`);
        throw new Error('All RPC endpoints failed to fetch token accounts.');
    }
}

module.exports = GetTokens;
