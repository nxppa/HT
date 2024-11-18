
const MainGetTokens = require("./MainServer")
const SubGetTokens = require("./SubServer")
function getCurrentTimeInSeconds() {
    return Date.now() / 1000;
}

TimeLastUsedMain = 0
TimeLastUsedSub = 0


let Queue = []


async function ProcessQueue() {
    const Wallet = Queue.shift()
    async function Retry() {
        const CurrentTime = getCurrentTimeInSeconds()
        if (CurrentTime - TimeLastUsedMain >= 1) {
            TimeLastUsedMain = CurrentTime
            return MainGetTokens(Wallet)
        } else {
            if (CurrentTime - TimeLastUsedSub >= 1) {
                TimeLastUsedSub = CurrentTime
                return SubGetTokens(Wallet)
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return Retry()
    }
    return Retry()
}

async function GetTokensRatelimitedAndSplit(Wallet) {
    Queue.push(Wallet)
    return ProcessQueue()
}




module.exports = GetTokensRatelimitedAndSplit;
