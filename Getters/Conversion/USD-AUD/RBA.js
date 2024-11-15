const axios = require('axios');
const cheerio = require('cheerio');
async function AUDTOUSD(Amount) {
    try {
        const url = `https://www.rba.gov.au/statistics/frequency/exchange-rates.html`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const RateDiv = $('#USD > td.highlight');
        if (RateDiv.length === 0) {
            console.log('Market cap div not found.');
            return;
        }
        const divTextContent = RateDiv.text().trim();
        const ParsedRate = parseFloat(divTextContent)
        const ParsedValue = Amount/ParsedRate
        return ParsedValue
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}


module.exports = { AUDTOUSD };
