require('dotenv').config();
const { Connection, PublicKey, clusterApiUrl} = require('@solana/web3.js');


const SOLANA_RPC_ENDPOINT = process.env.QuickNodeRPC
//! quicknode rpc

const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});
const TPID = new PublicKey(process.env.ProgramID)

async function GetTokens(Address) {
    const st = Date.now()
    const key = new PublicKey(Address)
    try {
        const response = await connection.getParsedTokenAccountsByOwner(key, {programId: TPID})
        const tokens = {};
        response.value.forEach((keyedAccount) => {
            const parsedInfo = keyedAccount.account.data.parsed.info;
            const mint = parsedInfo.mint;
            const tokenAmountInfo = parsedInfo.tokenAmount;
            const tokenAmount = parseFloat(tokenAmountInfo.uiAmountString);
            if (tokenAmount){
                tokens[mint] = tokenAmount
            }
        })
        const et = Date.now()
        console.log(`Time taken for GetTokens for wallet ${Address}: `, (et - st)/1000)
        return tokens;
    } catch (error) {
        console.error('Error fetching token accounts:', error, key);
        throw error;
    }
}

module.exports = GetTokens
