
const axios = require('axios');


async function FetchSolVal() {
    const Mint = "So11111111111111111111111111111111111111112"
    try {
        const url = `https://price.jup.ag/v4/price?ids=${Mint}`;
        
        const response = await axios.get(url);
        const data = response.data;
        if (data && data.data && data.data[Mint] && data.data[Mint].price) {
            return data.data[Mint].price;
        } else {
            console.log('failed to get solana data', data);
            return 0;
        }
    } catch (error) {
        console.error('Error fetching token price:', error.message);
        return null;
    }
}

module.exports = { FetchSolVal };

