require('dotenv').config();

const bs58 = require("bs58").default
const { PublicKey, VersionedTransaction, Connection, Keypair } = require('@solana/web3.js');

const REPLICATING_WALLET_PRIVATE_KEY = process.env.PrivateKey //* private wallet key

function PrivToPub(PrivateKey) {
  try {
    const privateKeyArray = bs58.decode(PrivateKey);
    const keypair = Keypair.fromSecretKey(privateKeyArray);
    return keypair.publicKey.toBase58();
  } catch (error) {
    console.log(error)
    throw new Error('Invalid private key format or input. Ensure it is a valid Base58-encoded string.');
  }
}

const MyWallet = PrivToPub(REPLICATING_WALLET_PRIVATE_KEY) //* public wallet address

const MyWalletPubKey = new PublicKey(MyWallet)
const SOLANA_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f"
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});
async function Swap(Mint, Amount, Slippage = 40, PrioFee = 0.0001, Type) {
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
    console.log(tx)
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(process.env.PrivateKey));
    tx.sign([signerKeyPair])
    const signature = await connection.sendTransaction(tx)
    console.log(signature)
    return signature
  } else {
    console.log(response)
  }
  
}
module.exports = { Swap }

