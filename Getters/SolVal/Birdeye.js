//! needs birdeye api key
//! limited to 30k calls each month
require('dotenv').config();

async function FetchSolVal() {
    const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': `${process.env.BirdEyeApiKey}`
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
