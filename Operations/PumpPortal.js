require('dotenv').config();

const bs58 = require("bs58").default
const { PublicKey, VersionedTransaction, Connection, Keypair } = require('@solana/web3.js')

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

//TODO Make a universal variable for these

const MyWallet = PrivToPub(REPLICATING_WALLET_PRIVATE_KEY) //* public wallet address

const MyWalletPubKey = new PublicKey(MyWallet)

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
    
    tx.sign([Keypair.fromSecretKey(bs58.decode(process.env.PrivateKey))])
    const EncodedAndSigned = bs58.encode(tx.serialize())
    const sigs = VersionedTransaction.deserialize(new Uint8Array(bs58.decode(EncodedAndSigned)));
    const ProperSig = sigs.signatures[0]
    const SigString = bs58.encode(ProperSig)

    try {
      const jitoResponse = await fetch(`https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "id": 1,
          "method": "sendTransaction",
          "params": [
            EncodedAndSigned
          ]
        })
      });
      return SigString
    } catch (e) {
      console.error(e.message);
    }
  } else {
    console.log("request failed");
    return false
  }
}
module.exports = { Swap }

