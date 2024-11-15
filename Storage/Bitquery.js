const axios = require('axios');

function getEndValue(inputStr) {
    const dataObject = JSON.parse(inputStr);
    const endValue = dataObject.data.Solana.DEXTradeByTokens[0].Trade.end;
    return endValue;
}

async function GetPrice(Mint) {
    let data = JSON.stringify({
        "query": `  query MyQuery {\n    Solana {\n      DEXTradeByTokens(\n        where: {\n          Transaction: { Result: { Success: true } }\n          Trade: {\n            Currency: {\n              MintAddress: { is: \"${Mint}\" }\n            }\n          }\n          Block: { Time: { since: \"2024-09-24T08:03:00Z\" } }\n        }\n      ) {\n        Trade {\n          end: PriceInUSD(maximum: Block_Time)\n        }}\n    }\n  }`,
        "variables": "{}"
    });
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://streaming.bitquery.io/eap',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'BQYfEC0szYytgrRFXP0dJYrHITqjC6o5',
            'Authorization': 'Bearer ory_at_Cv8YX6L7mggZvIce_bn4URk611INxQF6mxpT8na_sqg.5xkHJ51kNIvHvMidyVqUMSsySo5KfW3b_TIcbXCj8HI'
        },
        data: data
    };
    try {
        const response = await axios.request(config);
        return getEndValue(JSON.stringify(response.data));
    } catch (error) {
        console.log(error);
    }
}

module.exports = { GetPrice };
