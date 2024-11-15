const solanaWeb3 = require('@solana/web3.js');



async function fetchSolBalance(Wallet) {
    // Connect to the Solana Devnet or Mainnet (change 'devnet' to 'mainnet-beta' for mainnet)
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
  
    // Convert the wallet address into a PublicKey object
    const publicKey = new solanaWeb3.PublicKey(Wallet);
  
    // Fetch the balance (balance is in lamports, 1 SOL = 1,000,000,000 lamports)
    const lamports = await connection.getBalance(publicKey);
  
    // Convert lamports to SOL
    const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
    
    return solBalance;
  }
  
  // Main function to fetch SOL and USD balance
  async function getWalletBalance(Wallet) {
    try {
        const solBalance = await fetchSolBalance(Wallet);
      return solBalance
  
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
  }


  module.exports = { getWalletBalance };
