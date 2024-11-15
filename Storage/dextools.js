const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function GetPrice(Mint) {
    try {
        const url = `https://pump.fun/${Mint}`;
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Disable cache to ensure fresh content
        await page.setCacheEnabled(false);

        // Optional: Set a custom User-Agent to mimic a real browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/89.0.4389.82 Safari/537.36');

        // Navigate to the page and wait until the network is idle
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Optional: Wait for a specific selector to ensure content is loaded
        // Replace '.your-selector' with the actual selector for the content
        // await page.waitForSelector('.your-selector');

        // Get the page content
        const content = await page.content();

        // Load content into Cheerio
        const $ = cheerio.load(content);

        // Extract the data you need
        // Replace '.price-selector' with the actual selector
        // const price = $('.price-selector').text();

        // For demonstration, we'll log the entire HTML
        console.log($.html());

        await browser.close();

        // Return the Cheerio object or the extracted data
        return $; // or return price;

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

GetPrice("1SffhPgJM3ocWdRmcgZHpcaxVbtgGJfKb8UatxVpump");
module.exports = { GetPrice };
