const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
const SOLANA_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f" //TODO MAYBE make it use multiple endpoints 
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
});



async function SPLToOwner(Account){
    const Key = typeof(Account) == "string" ? new PublicKey(Account) : Account
    const response = await connection.getParsedAccountInfo(Key)
    return response
}

module.exports = {SPLToOwner}