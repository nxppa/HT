// Helius.js
require('dotenv').config();

async function getAsset(assetId) {
    const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HeliusApiKey}`;

    const body = {
        "jsonrpc": "2.0",
        "method": "getAsset",
        "params": {
            "id": assetId
        },
        "id": 1
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const Output = {
            "name": data.result.content.metadata.name,
            "description": data.result.content.metadata.description,
            "symbol": data.result.content.metadata.symbol,
            //"Image": data.result.content.files.uri
        }
        return Output;
    } catch (error) {
        console.error('Error fetching asset data:', error);
        throw error;
    }
}

module.exports = { getAsset };

/*
--USAGE--

import { getAsset } from './Helius.js';

async function fetchAndDisplayAsset() {
    try {
        const assetId = "F9Lw3ki3hJ7PF9HQXsBzoY8GyE6sPoEZZdXJBsTTD2rk"; // Example asset ID
        const assetData = await getAsset(assetId);
        console.log("Asset Data:", assetData);
    } catch (error) {
        console.error("Error fetching and displaying asset:", error);
    }
}

fetchAndDisplayAsset();



*/