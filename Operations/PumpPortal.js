const REPLICATING_WALLET_PRIVATE_KEY = '28L65yF3ont5Jrb2DuHdnMb7ohQ1Wo2kLzSi4ujJcTsQcDyNaBmNBMKEqLXA35Q7kvinvYsbj43JBEA3BhF7gB3r' //* private wallet key
const MyWallet = "5DtSqQQbbVKtgMosGsgRDDPKPizTeFijA9DEEfK9Exfe" //* public wallet address

//TODO Make a universal variable for these


const { PublicKey, VersionedTransaction, Connection, Keypair } = require('@solana/web3.js')
const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const bs58 = require("bs58").default
const MyWalletPubKey = new PublicKey(MyWallet)
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});



connection.onLogs(MyWalletPubKey, async (logs, ctx) => {
  console.log(logs)
}, 'confirmed')


function GetTime(raw) {
  const now = new Date()
  let time = raw ? `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()},${now.getMilliseconds()}` : `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;

  return time
}

const web3Connection = new Connection(
  SOLANA_RPC_ENDPOINT,
  'confirmed',
);

async function Swap(Mint, Amount, Slippage = 40, PrioFee = 0.00001, Type) {
  const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify({
      "publicKey": MyWalletPubKey.toString(),
      "action": Type,
      "mint": Mint, 
      
      "denominatedInSol": "false",

      "amount": Amount, 
      "slippage": Slippage, 
      "priorityFee": PrioFee,
      "pool": "pump" 
    })
  });
  if (response.status === 200) {
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(REPLICATING_WALLET_PRIVATE_KEY));
    console.log(data)
    console.log(tx)
    tx.sign([signerKeyPair]);
    try {
      const signature = await web3Connection.sendTransaction(tx, {
        skipPreflight: true
      });
      return signature
    } catch (Err) {
      console.log(Err)
      return false
    }
  } else {
    console.log("request failed"); 
    return false
  }
}

module.exports = { Swap }

