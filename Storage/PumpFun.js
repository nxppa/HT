const axios = require('axios');
const cheerio = require('cheerio');
const Bil = 1000000000
async function PumpPrice(Mint) {
    try {
        const url = `https://pump.fun/${Mint}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const marketCapDiv = $('div.text-sm.text-green-300.flex.gap-2');
        if (marketCapDiv.length === 0) {
            console.log('Market cap div not found.');
            return;
        }
        const divTextContent = marketCapDiv.text().trim();
        const marketCapText = divTextContent.replace('Market cap: $', '').trim();
        const marketCapValue = parseFloat(marketCapText.replace(/,/g, ''));
        return marketCapValue/Bil
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}


module.exports = { PumpPrice };
