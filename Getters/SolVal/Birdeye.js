//! needs birdeye api key
//! limited to 30k calls each month
const fetch = require('node-fetch');

async function FetchSolVal() {
    const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': '27dd9a2f9c1d49bcb82b5d450f22b4f8'
        }
      };

  const url = `https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112`;
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if(!data.data){
      console.log(data)
    }
    return data.data.value; // Return the price in SOL
  } catch (err) {
    console.error('Error fetching token price:', err);
    throw err; // Rethrow the error if needed
  }
}

module.exports = {FetchSolVal};
