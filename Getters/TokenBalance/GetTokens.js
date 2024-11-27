require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const SOLANA_RPC_ENDPOINTS = [
    //"https://api.mainnet-beta.solana.com",
    //"https://solana-mainnet.core.chainstack.com/155d8d316c41d2ab16e07ee9190e409c",
    //"https://solana-mainnet.api.syndica.io/api-key/4MPquh8r1sBddBwSk6bN3pEHWF241B15QjPVGM5NJCTaetdXSKWyKiGrbw2XtM6YLa6EnYUExb6c5Hras1ocYuUks3YvmtMKDNj",
    "https://solana-rpc.publicnode.com/",
    "https://virulent-few-dawn.solana-mainnet.quiknode.pro/272b003581d3e1ec81ab5ccf9f7a8008cb0453ec",
    "https://rpc-mainnet.solanatracker.io/?api_key=81b71925-ca06-487c-ac6c-155d8a9e3cda",
    "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7",
    "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f",
];

const TPID = new PublicKey(process.env.ProgramID);

async function fetchTokensFromEndpoint(rpc, address, programId) {
    const connection = new Connection(rpc, {
        commitment: 'confirmed',
    });

    const st = Date.now();
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

    const et = Date.now();
    console.log(`Success from RPC ${rpc}. Time taken: ${(et - st) / 1000}s`);
    return tokens;
}

async function GetTokens(Address) {
    const key = new PublicKey(Address);

    // Create an array of promises, one for each RPC endpoint
    const fetchPromises = SOLANA_RPC_ENDPOINTS.map((rpc) =>
        fetchTokensFromEndpoint(rpc, key, TPID)
    );

    try {
        // Use Promise.race to resolve as soon as the first successful response is received
        const tokens = await Promise.any(fetchPromises);
        return tokens;
    } catch (errors) {
        console.error('All RPC endpoints failed:', errors);
        throw new Error('All RPC endpoints failed to fetch token accounts.');
    }
}

module.exports = GetTokens;