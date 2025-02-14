const bs58 = require("bs58").default
const { PublicKey, VersionedTransaction, Connection, Keypair } = require('@solana/web3.js');

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

async function Swap(Key, Mint, Amount, Slippage = 40, PrioFee = 0.0001, Type, MainConnection) {
  console.log("ALL PARAMETERS: ", {Key, Mint, Amount, Slippage, PrioFee, Type})
  const CurrentWallet = PrivToPub(Key) //* public wallet address
  const CurrentWalletPubKey = new PublicKey(CurrentWallet)
  const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "publicKey": CurrentWalletPubKey.toString(),
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
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(Key));
    tx.sign([signerKeyPair])
    const signature = await MainConnection.sendTransaction(tx)
    console.log(signature)
    return signature
  } else {
    console.log("Did not return 200: ", response)
  } 

}
module.exports = { Swap }

