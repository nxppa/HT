//! rate limited to 30 calls per minute
async function GeckoPrice(Mint) {
    const url = `https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/${Mint}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.data.attributes.token_prices[Mint]){
            return undefined
        }
        const TP = parseFloat(data.data.attributes.token_prices[Mint])
        console.log("GeckoPrice: ", TP)
        return TP // Adjust as needed to return specific data from the response
    } catch (error) {
        return undefined;
    }
}

module.exports = {GeckoPrice}