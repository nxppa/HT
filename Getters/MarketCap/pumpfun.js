const axios = require('axios');
const cheerio = require('cheerio');

async function GetMarketCap(Mint) {
    try {
        const url = `https://pump.fun/${Mint}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Use the exact selector from your working code
        const marketCapDiv = $('div.text-sm.text-green-300.flex.gap-2');

        if (marketCapDiv.length === 0) {
            console.log('Market cap div not found.');
            return;
        }

        // Extract and process the text content as you did
        const divTextContent = marketCapDiv.text().trim();
        const marketCapText = divTextContent.replace('Market cap: $', '').trim();
        const marketCapValue = parseFloat(marketCapText.replace(/,/g, ''));

        return marketCapValue;

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}


module.exports = { GetMarketCap };
