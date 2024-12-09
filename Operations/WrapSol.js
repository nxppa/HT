require('dotenv').config();
const { Connection, Keypair,  SystemProgram, Transaction, VersionedTransaction, clusterApiUrl } = require("@solana/web3.js")
const { NATIVE_MINT, createSyncNativeInstruction, ASSOCIATED_TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token")
const bs58 = require("bs58").default

const privateKey = process.env.PrivateKey
const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
const Bil = 1000000000;
const connection = new Connection("https://public.ligmanode.com", "confirmed");
async function WrapSol(amount) {
    amount *= Bil
    console.log(amount)
 
  const latestBlockhash = await connection.getLatestBlockhash({
    commitment: 'confirmed',
  });
  let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      NATIVE_MINT,
      wallet.publicKey
    )
    
    let transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: associatedTokenAccount.address,
            lamports: amount,
        }),
        createSyncNativeInstruction(associatedTokenAccount.address)
    );
    
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = wallet.publicKey
    const serializedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: true });
    const transactionBase64 = serializedTransaction.toString('base64');
    
    const recoveredTransaction = getRawTransaction(transactionBase64);
    if (recoveredTransaction instanceof VersionedTransaction) {
    recoveredTransaction.sign([wallet]);
  } else {
    recoveredTransaction.partialSign(wallet);
  }
  const txnSignature = await connection.sendRawTransaction(recoveredTransaction.serialize());

  console.log(`Wrapped SOL successfully: Signature: ${txnSignature}`);
}

function getRawTransaction(encodedTransaction) {
    let recoveredTransaction;
    try {
      recoveredTransaction = Transaction.from(
        Buffer.from(encodedTransaction, 'base64')
      );
    } catch (error) {
      recoveredTransaction = VersionedTransaction.deserialize(
        Buffer.from(encodedTransaction, 'base64')
      );
    }
    return recoveredTransaction;
  }
module.exports = {WrapSol}