
const fetch = require('node-fetch');
async function FetchSolVal() {


  const url = `https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if(!data.data){
      console.log(data)
    }
    return data.data["So11111111111111111111111111111111111111112"].Price; // Return the price in SOL
  } catch (err) {
    console.error('Error fetching token price:', err);
    throw err; // Rethrow the error if needed
  }
}

module.exports = {FetchSolVal};
