/**********************************************************/
/*  swapRaydium.js - Swapping SOL <-> Target Token on SDK */
/**********************************************************/
const RPC_URL = 'https://api.mainnet-beta.solana.com' // or devnet RPC
const PRIVATE_KEY = '54fcJH1GBkP7EqDx3PMgfUph4yG9e3J6yYP2bDB5sWYStPNZMdj1zXKm6C7cnmmWoNPE1yrSv3Ws4VHnyhcH3R4i'


const RAYDIUM_LIQUIDITY_JSON = './liquidity.mainnet.json' 
  // or 'https://raw.githubusercontent.com/raydium-io/raydium-liquidity-pools/main/mainnet.json'

const WSOL_MINT = 'So11111111111111111111111111111111111111112'

const {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  TransactionMessage
} = require('@solana/web3.js')
const {
  Liquidity,
  jsonInfo2PoolKeys,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT
} = require('@raydium-io/raydium-sdk')
const { Wallet } = require('@coral-xyz/anchor')
const bs58 = require('bs58').default
const fs = require('fs')
const path = require('path')

/**
 *  Caches the pool JSON data after loading it once.
 */
let allPoolKeysJson = null

/**
 * Exported function for swapping SOL <-> a target token on Raydium.
 *
 * @param {string} targetMint  The target token’s mint address (e.g. USDC mint).
 * @param {number} amount      The amount of the target token (in normal human units).
 * @param {number} slippage    The slippage percentage (e.g. 5 = 5%).
 * @param {number} priorityFee The priority fee (micro-lamports) for the compute budget.
 * @param {'buy'|'sell'} type  "buy" means buy target tokens (spend SOL), "sell" means sell target tokens (receive SOL).
 * @returns {Promise<string>}   Returns the transaction signature (txid).
 */
async function swapRaydium(targetMint, amount, slippage, priorityFee, type) {
  // ---------------------------------------------------------
  // Step 1: Initialize the Solana connection and wallet
  // ---------------------------------------------------------
  if (!RPC_URL) {
    throw new Error('Please set RPC_URL at the top of this file')
  }
  if (!PRIVATE_KEY) {
    throw new Error('Please set PRIVATE_KEY at the top of this file')
  }

  const connection = new Connection(RPC_URL, { commitment: 'confirmed' })
  const wallet = new Wallet(
    Keypair.fromSecretKey(Uint8Array.from(bs58.decode(PRIVATE_KEY)))
  )

  // ---------------------------------------------------------
  // Step 2: Load (or cache) the Raydium pool JSON if needed
  // ---------------------------------------------------------
  if (!allPoolKeysJson) {
    allPoolKeysJson = await loadLiquidityJson(RAYDIUM_LIQUIDITY_JSON)
  }

  // ---------------------------------------------------------
  // Step 3: Find the wSOL <-> target token pool
  // ---------------------------------------------------------
  const poolKeys = findPoolInfoForTokens(WSOL_MINT, targetMint, allPoolKeysJson)
  if (!poolKeys) {
    throw new Error(`No Raydium pool found for wSOL <-> ${targetMint}`)
  }

  // ---------------------------------------------------------
  // Step 4: Determine if we are "buying" or "selling"
  //         and compute the required "amountIn" / "amountOut"
  // ---------------------------------------------------------
  //  - 'buy'  => want exactly "amount" of target token (out), spend SOL (in)
  //  - 'sell' => have exactly "amount" of target token (in), receive SOL (out)

  // 4.1: Fetch the on-chain pool data
  const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys })

  // 4.2: Identify decimals
  //     wSOL is typically 9 decimals
  //     targetMint decimals come from the pool info
  let targetDecimals
  if (poolKeys.baseMint.toString() === targetMint) {
    targetDecimals = poolInfo.baseDecimals
  } else {
    targetDecimals = poolInfo.quoteDecimals
  }

  // 4.3: Convert `amount` (human-readable) -> raw integer
  //      Example: if token has 6 decimals and user says 1.23 => raw = 1230000
  const rawTargetAmount = Math.round(amount * 10 ** targetDecimals)

  // 4.4: Slippage object
  const slippagePct = new Percent(slippage, 100) // e.g. 5 => 5%

  // Depending on buy or sell, we'll call the correct Raydium compute function
  let amountInTokenAmount, amountOutTokenAmount
  let fixedSide

  if (type === 'buy') {
    // We want to end up with `amount` of target tokens, so fix side='out'
    // We must compute how much SOL (in) is required.
    const result = await Liquidity.computeAmountIn({
      poolKeys,
      poolInfo,
      currencyOut: {
        mint: new PublicKey(targetMint),
        decimals: targetDecimals
      },
      amountOut: rawTargetAmount, // raw integer for target token
      slippage: slippagePct
    })

    // result.amountIn  = how many raw SOL lamports we need
    // result.amountOut = the exact out amount (slippage accounted if needed)

    amountInTokenAmount = result.amountIn
    amountOutTokenAmount = result.amountOut

    fixedSide = 'out'
  } else if (type === 'sell') {
    // We have `amount` of target tokens, so fix side='in'
    // We'll compute how much SOL (out) we get.
    const result = await Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      currencyIn: {
        mint: new PublicKey(targetMint),
        decimals: targetDecimals
      },
      amountIn: rawTargetAmount,
      slippage: slippagePct
    })

    // result.amountOut = how many SOL lamports we get
    // result.amountIn  = the raw input in target tokens

    amountInTokenAmount = result.amountIn
    amountOutTokenAmount = result.amountOut

    fixedSide = 'in'
  } else {
    throw new Error(`Invalid type: must be 'buy' or 'sell'`)
  }

  // ---------------------------------------------------------
  // Step 5: Build the swap instructions (versioned transaction)
  // ---------------------------------------------------------
  const userTokenAccounts = await getOwnerTokenAccounts(connection, wallet.publicKey)

  // Create swap instructions
  const swapInstruction = await Liquidity.makeSwapInstructionSimple({
    connection,
    makeTxVersion: 0, // 0 => versioned transaction
    poolKeys,
    userKeys: {
      tokenAccounts: userTokenAccounts,
      owner: wallet.publicKey
    },
    amountIn: amountInTokenAmount,
    amountOut: amountOutTokenAmount,
    fixedSide,
    config: {
      bypassAssociatedCheck: false
    },
    computeBudgetConfig: {
      microLamports: priorityFee // user-specified priority fee
    }
  })

  // Extract instructions from the generated swap transaction
  const recentBlockhash = await connection.getLatestBlockhash()
  const instructions = []
  const innerIxs = swapInstruction.innerTransactions[0].instructions
  for (let i = 0; i < innerIxs.length; i++) {
    if (innerIxs[i]) {
      instructions.push(innerIxs[i])
    }
  }

  // ---------------------------------------------------------
  // Step 6: Construct a VersionedTransaction
  // ---------------------------------------------------------
  const message = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: recentBlockhash.blockhash,
    instructions
  }).compileToV0Message()

  const versionedTx = new VersionedTransaction(message)
  versionedTx.sign([wallet.payer])

  // ---------------------------------------------------------
  // Step 7: Send the transaction
  // ---------------------------------------------------------
  const txid = await connection.sendTransaction(versionedTx, {
    skipPreflight: true
  })

  console.log(`swapRaydium [${type.toUpperCase()}] => txid:`, txid)
  return txid
}

module.exports = swapRaydium

/****************************************************/
/*          Below are helper functions              */
/****************************************************/

/**
 * Loads the Raydium liquidity JSON (official + unOfficial) from a file or URL.
 */
async function loadLiquidityJson(liquidityFile) {
  let liquidityJson
  if (liquidityFile.startsWith('http')) {
    // If you use 'fetch' in Node, ensure you have a polyfill or Node 18+
    const resp = await fetch(liquidityFile)
    if (!resp.ok) {
      throw new Error(`Failed to fetch liquidity JSON from ${liquidityFile}`)
    }
    liquidityJson = await resp.json()
  } else {
    const raw = fs.readFileSync(path.join(__dirname, liquidityFile), 'utf-8')
    liquidityJson = JSON.parse(raw)
  }
  const official = liquidityJson.official || []
  const unOfficial = liquidityJson.unOfficial || []
  return [...official, ...unOfficial]
}

/**
 * Finds a pool by matching two mints (A and B).
 * Returns the poolKeys object if found, otherwise null.
 */
function findPoolInfoForTokens(mintA, mintB, allPools) {
  for (let i = 0; i < allPools.length; i++) {
    const p = allPools[i]
    if (
      (p.baseMint === mintA && p.quoteMint === mintB) ||
      (p.baseMint === mintB && p.quoteMint === mintA)
    ) {
      return jsonInfo2PoolKeys(p)
    }
  }
  return null
}

/**
 * Retrieves token accounts owned by a particular public key.
 */
async function getOwnerTokenAccounts(connection, ownerPubkey) {
  const { value } = await connection.getTokenAccountsByOwner(ownerPubkey, {
    programId: TOKEN_PROGRAM_ID
  })
  const accounts = []
  for (let i = 0; i < value.length; i++) {
    const acc = value[i]
    accounts.push({
      pubkey: acc.pubkey,
      programId: acc.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(acc.account.data)
    })
  }
  return accounts
}
