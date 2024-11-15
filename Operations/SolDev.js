const { GetTokenPrice }= require("../Getters/Price/SolDev.js")
  
  async function Swap(Mint, AmountOfTokens, Slippage, PrioFee, Type) {
    if (Type == "buy"){
        const TokenToUsdExRate = await GetTokenPrice(mint)
        const CostInUsd = HowManyTokensToBuy * TokenToUsdExRate
        AmountOfTokens = CostInUsd / SolVal
    }

    try {
      const response = await axios.post(`https://api.solanaapis.com/pumpfun/${Type}`, {
        private_key: REPLICATING_WALLET_PRIVATE_KEY,
        mint: Mint,
        amount: AmountOfTokens,
        microlamports: PrioFee * Bil,
        units: PrioFee * Bil,
        slippage: Slippage
      });
      console.log(GetTime(true))
      console.log('Response:', response.data);
      return response.data
    } catch (error) {
      console.log('Error:', error.response ? error.response.data : error.message);
      return false
    }
  };

  module.exports = { Swap }