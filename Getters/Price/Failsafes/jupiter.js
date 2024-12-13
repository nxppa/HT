//! wont have data on coins made ~2 mins ago

const axios = require('axios');


async function JupiterPrice(Mint) {
    try {
        const url = `https://price.jup.ag/v4/price?ids=${Mint}`;
        
        const response = await axios.get(url);
        const data = response.data;
        if (data && data.data && data.data[Mint] && data.data[Mint].price) {
            const TP = data.data[Mint].price
            console.log("JupPrice: ", TP)
            return TP;
        } else {
            return undefined;
        }
    } catch (error) {
        console.error('Error fetching token price:', error.message);
        return undefined;
    }
}

module.exports = { JupiterPrice };

