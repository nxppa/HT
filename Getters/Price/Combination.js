const { DevPrice } = require("./Failsafes/SolDev");
const { GeckoPrice } = require("./Failsafes/CoinGecko");
const { JupiterPrice } = require("./Failsafes/jupiter");
const { HeliusPrice } = require("./Failsafes/Helius");
const { PumpPrice } = require("./Failsafes/Pumpfun");
//TODO make error logging less intrusive 
function GetTime(raw) {
    const now = new Date();
    let time = raw 
        ? `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()},${now.getMilliseconds()}` 
        : `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;

    return time;
}
async function GetPrice(Mint) {
    const st = Date.now()
    const priceGetters = {
        DevPrice: DevPrice(Mint),
        GeckoPrice: GeckoPrice(Mint),
        JupiterPrice: JupiterPrice(Mint),
        PumpPrice: PumpPrice(Mint)
        // !HeliusPrice: HeliusPrice(Mint), //Currently broken
    };
    const promises = [];
    for (const [name, promise] of Object.entries(priceGetters)) {
        promises.push(
            promise.then(price => {
                if (price !== undefined) return price;
                throw new Error(`${name} returned undefined`);
            })
        );
    }
    try {
        const et = Date.now()
        console.log(`Time taken for GetPrice for mint ${Mint}: `, (et - st)/1000)
        return await Promise.any(promises);
    } catch (error) {
        console.log("All price getters failed or returned undefined.");
        return null; // or handle the no valid price case as needed
    }
}


module.exports = { GetPrice };
