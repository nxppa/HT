const GetTokens = require("./GetTokens")
async function MainGetTokens(Address) {
    console.log("using main", Address)
    return GetTokens(Address)
}
module.exports = MainGetTokens
