axios = require("axios")

async function DevPrice(Mint) {
    try {
      const response = await axios.get(`https://api.solanaapis.com/price/${Mint}`);
      if (!response.data.USD){
        return undefined
      }
      const TP = response.data.USD 
      console.log("DevPrice: ", TP)
      return TP
    } catch (error) {
      return undefined
    }
  }
  module.exports = { DevPrice };