const GetTokens = require("./GetTokens")
async function MainGetTokens(Address) {
    console.log("using main")
    return GetTokens(Address)
}
module.exports = MainGetTokens
