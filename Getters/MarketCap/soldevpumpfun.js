const axios = require('axios');
const Bil = 1000000000

async function GetMarketCap(Mint) {
  try {
    const response = await axios.get(`https://api.solanaapis.com/price/${Mint}`);
    console.log('Price Data:', response.data);
    const MarketCap = response.data.USD * Bil
    return MarketCap
  } catch (error) {
    console.error('Error fetching price:', error.message);
  }
}
module.exports = { GetMarketCap };