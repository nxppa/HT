const { Connection, PublicKey, clusterApiUrl} = require('@solana/web3.js');
const SOLANA_RPC_ENDPOINT = clusterApiUrl('mainnet-beta');
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});

async function GetTokens(Address) {
    const key = new PublicKey(Address)
    try {
        const response = await connection.getParsedTokenAccountsByOwner(key, {programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')})
        const tokens = {};
        response.value.forEach((keyedAccount) => {
            const parsedInfo = keyedAccount.account.data.parsed.info;
            const mint = parsedInfo.mint;
            const tokenAmountInfo = parsedInfo.tokenAmount;
            const tokenAmount = parseFloat(tokenAmountInfo.uiAmountString);
            tokens[mint] = tokenAmount
        })
        return tokens;
    } catch (error) {
        console.error('Error fetching token accounts:', error, key);
        throw error;
    }
}

module.exports = GetTokens
