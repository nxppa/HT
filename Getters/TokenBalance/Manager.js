
const MainGetTokens = require("./MainServer")
const SubGetTokens = require("./SubServer")
function getCurrentTime() {
    return Date.now() / 1000;
}
let ProcessQueue = []



async function GetTokensRatelimitedAndSplit(Wallet) {
    ProcessQueue.push(Wallet)
}

module.exports = GetTokensRatelimitedAndSplit;
