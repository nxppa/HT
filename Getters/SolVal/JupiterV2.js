
async function FetchSolVal() {
  const url = `https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if(!data.data){
      console.log(data)
    }
    const SolData = data.data["So11111111111111111111111111111111111111112"]
    if (!SolData){
      console.log("failed to get sol val")
    }
    return SolData.price
  } catch (err) {
    console.error('Error fetching token price:', err);
    throw err; // Rethrow the error if needed
  }
}

module.exports = {FetchSolVal};
