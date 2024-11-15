async function HeliusPrice(Mint) {
    const apiKey = '62867695-c3eb-46cb-b5bc-1953cf48659f'; // Replace with your actual API key
    const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    
    const payload = {
      "jsonrpc": "2.0",
      "method": "getAsset",
      "params": {
        "id": Mint
      },
      "id": 1
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const data = await response.json();
      if (!data.result.token_info || ! data.result.token_info.price_info){
        return undefined
      }
      const TP = data.result.token_info.price_info.price_per_token;
      console.log("HelPrice: ", TP)
      return TP
    } catch (error) {
      console.error('Error fetching asset:', error);
      throw error;
    }
}

module.exports = {HeliusPrice}