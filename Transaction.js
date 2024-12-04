const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
const { Swap } = require("./Operations/PumpPortal.js")


const SOLANA_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f"
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});
MyWalletPubKey = new PublicKey("AiVsvPcbZ29HYeVuS9GMf9yfXWTy1vbUaRV9ChfEp3Mp")
connection.onLogs(MyWalletPubKey, async (logs, ctx) => {
  console.log(logs)
}, 'confirmed')





async function main() {
  setTimeout(() => {
    Swap("D2Hc3ndqW95BGtC7KzftBPnvP4qrDEB9YSsC1q1Apump", 1, 40, 0.0001, "buy")
  }, 5000);

}


main()