require('dotenv').config();
const { FetchSolVal } = require('./Getters/SolVal/JupiterV2.js');
const { AUDTOUSD } = require("./Getters/Conversion/USD-AUD/RBA.js")
const { GetPrice } = require('./Getters/Price/Combination.js');
const { Swap } = require('./Operations/PumpPortal.js');
const GetTokens = require("./Getters/TokenBalance/GetTokens.js")
const {SPLToOwner} = require("./Getters/SPLToOwner.js")
const {getAsset} = require("./Getters/AssetInfo/Helius.js")
const {ParseSignature} = require("./Getters/ParsedSignature/ParseSig.js")

const WalletCheckBaseAddress = "https://gmgn.ai/sol/address/"
const MintCheckBaseAddress = "https://gmgn.ai/sol/token/"
const SigCheckBaseAddress = "https://solscan.io/tx/"

const SOL_MINT_ADDRESS = process.env.SOL
const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
//TODO fix logssubscribe errors.

const axios = require("axios")
const express = require('express');
const bs58 = require("bs58").default
const fs = require('fs');
const os = require("os")
const Events = require("events")
const { getAssociatedTokenAddressSync } = require("@solana/spl-token")


const MyWallet = PrivToPub(process.env.PrivateKey)
const MyWalletPubKey = new PublicKey(MyWallet)
const TelegramKey = process.env.TelegramKey;
const TPID = new PublicKey(process.env.ProgramID)
const Simulating = false
const ConsecutiveSellsThreshold = 1000
const MAX_SIGNATURES = 100
const Unfilled = "□"
const Filled = "■"
const BarSize = 10
const Bil = 1000000000
const MaxRetries = 20
const SpecialTokens = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  So11111111111111111111111111111111111111112: "WSOL",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr: "EURC",
}

let StartedLogging = false
let NumWalletsAdded = 0

let SimulatingStartAmountUSD = 189.04

let targetWallets = {}
let ConsecutiveSells = {}
let InitialMessageIDForEach = {}
let TransactionDetectionIDToMessageIDForEach = {}


const IDToName = {
  6050162852: "Naps",
  1788282135: "Revvin Dev",
  679687518: "Sasha the basher",
}

for (const ID in IDToName) {
  TransactionDetectionIDToMessageIDForEach[ID] = {}
}
const BaseFilePath = './db/'

let CompletedCopies = []
let SetParameters = {}



let myWalletBalanceInSol = null



function isEthereumOrSolanaAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
let MyTokens = {}
let SolVal = FetchSolVal()
async function updateValue() {
  const Fetched = await FetchSolVal()
  if (Fetched) {
    SolVal = Fetched
  }
}
function startConstantUpdate() {
  setInterval(async () => {
    await updateValue()
  }, 10000)
}

updateValue()
startConstantUpdate()
function IsPumpCoin(Mint) {
  return Mint.toLowerCase().endsWith("pump");
}
function inferTransactionType(amount) {
  if (amount > 0) {
    return 'buy'
  } else if (amount < 0) {
    return 'sell'
  } else {
    return 'no change'
  }
}

process.on('uncaughtException', (error) => {
  console.log('Uncaught exception:', error);
  error = error || 0
  SendToAll("Error: " + error.toString(), "Markdown")
  process.exit(1)
});

function GetTime(raw) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    fractionalSecondDigits: 3,
    hour12: false,
    timeZone: 'Australia/Sydney',
  });
  const timeString = formatter.format(now);
  const time = raw ? timeString : `[${timeString}]`;

  return time;
}
async function getWalletBalance(Wallet) {

  return await connection.getBalance(new PublicKey(Wallet)) / Bil //TODO make it so it uses multiple endpoints

}
function ToDecimalString(num) {
  if (Math.abs(num) < 1e-6) {
    return num.toFixed(20).replace(/\.?0+$/, "")
  }
  let [integerPart, fractionalPart] = num.toString().split('e');
  if (!fractionalPart) {
    return integerPart
  }
  let exponent = parseInt(fractionalPart, 10);
  if (exponent > 0) {
    return integerPart.replace('.', '') + '0'.repeat(exponent - (integerPart.split('.')[1]?.length || 0));
  } else {
    let digits = integerPart.replace('.', '');
    return '0.' + '0'.repeat(Math.abs(exponent) - 1) + digits;
  }
}

function GetShorthandVersion(str, NumChar) {
  return str.slice(0, NumChar).toString() + "․․․"
}

//-------My Wallet Logs ------\\
let MyWalletAnalysis = {}
const SOLANA_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f" //TODO make it so that it uses multiple endpoints
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});
connection.onLogs(MyWalletPubKey, async (logs, ctx) => {
  if (!MyWalletAnalysis[logs.signature]) {
    MyWalletAnalysis[logs.signature] = logs
    Events.emit("AnalysisLogsAdded", logs.signature)
    UpdateMyWallet()
  }
}, 'confirmed')

function findMatchingStrings(stringsArray, substringsArray, Includes) {
  for (let i = 0; i < stringsArray.length; i++) {
    const originalString = stringsArray[i];
    for (let j = 0; j < substringsArray.length; j++) {
      if (Includes) {
        if (originalString.includes(substringsArray[j])) {
          return substringsArray[j]
        }
      } else {
        if (originalString == substringsArray[j]) {
          return substringsArray[j]
        }
      }
    }
  }
  return null
}
function roundToDigits(number, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(number * factor) / factor;
}


async function UpdateMyWallet() {
  myWalletBalanceInSol = Simulating ? (SimulatingStartAmountUSD / SolVal) : await getWalletBalance(MyWallet)
}

function AreDictionariesEqual(dict1, dict2) {
  const keys1 = Object.keys(dict1);
  const keys2 = Object.keys(dict2);
  if (keys1.length !== keys2.length) return false;
  for (let key of keys1) {
    const val1 = dict1[key];
    const val2 = dict2[key];
    if (val1 === val2) continue;
    if (isNaN(val1) && isNaN(val2)) continue
    return false;
  }
  return true;
}
function PrivToPub(PrivateKey) {
  try {
    const privateKeyArray = bs58.decode(PrivateKey);
    console.log(privateKeyArray)
    const keypair = Keypair.fromSecretKey(privateKeyArray);
    return keypair.publicKey.toBase58();
  } catch (error) {
    console.log(error)
    throw new Error('Invalid private key format or input. Ensure it is a valid Base58-encoded string.');
  }
}
async function isValidEdwardsPoint(R) {
  try {
      const point = await ed25519.Point.fromHex(R); // Convert R to an Edwards point
      return !point.hasSmallOrder();
  } catch {
      return false; // If the conversion fails, R is not a valid point
  }
}
function SignatureSyntaxMatch(sig){
  try {
      const Signature = bs58.decode(sig)
      if (Signature.length !== 64) {
          Signature.length
          return false
      }
      const R = Signature.slice(0, 32); // First 32 bytes
      const S = Signature.slice(32);   // Last 32 bytes
      if (!isValidEdwardsPoint(R)) {
          return false;
      }
      return true;
  } catch (err) {
      return false
  }
}
function containsNonBase58Character(str) {
  try {
      bs58.decode(str);
      return false
  } catch (e) {
      return true
  }
}

function unixToRegularTime(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleString();
}
async function AnalyseAccount(Account) {
  if (containsNonBase58Character(Account)){
    return "Contains non base 58 character. Could not parse"
  }
  const Matches = SignatureSyntaxMatch(Account)
  let ResponseString = "```"
  if (Matches) {
      ResponseString += "Signature\n"
      ResponseString += `✍️ Signature: ${Account}\n` 
      const parsed = await ParseSignature(Account)
      if (parsed){
        ResponseString+= parsed
      } else {
        return "couldnt get parsed transaction for signature"
      }
      ResponseString += "```"
    return ResponseString;
  }
  let publicKey = ""
  try {
    publicKey = typeof(Account) == "string" ? new PublicKey(Account) : Account
  } catch {
    return "invalid input"
  }
  const accountInfo = await connection.getParsedAccountInfo(publicKey)
  if (!accountInfo.value){
    return "could not find data on account"
  }
  const data = accountInfo.value.data;
  if (!data || data === 'none') {
      return "acc not parsed";
  }
  const parsed = data.parsed;
  const program = data.program;
  if (program === 'spl-token') {
    if (parsed && parsed.type === 'mint') {
      ResponseString += "Mint\n"
      const MintInfo = await getAsset(Account)
      const Price = await GetPrice(Account)
      ResponseString += `Address: ${Account}\n`
      for (let k in MintInfo){
        const Info = MintInfo[k]
        if (Info){
          ResponseString += `${k}: ${Info}\n`
        }
      }
      ResponseString += `USD: $${Price}\n`
      ResponseString += `MC: $${Price * Bil}\n`
      ResponseString += "```"
      return ResponseString
    }
    if (parsed && parsed.type === 'account') {
      const info = parsed.info;
      const mint = new PublicKey(info.mint);
      const owner = new PublicKey(info.owner);
      const ata = getAssociatedTokenAddressSync(mint, owner, true, TPID);
      if (ata.equals(publicKey)) {
          ResponseString += "SPL\n"
          ResponseString +=  "Authority: " + owner //TODO get balance for this
          ResponseString += "```"
        return ResponseString
      }
      return 'token account';
    }
  }
  const TheirBal = await connection.getBalance(publicKey) / Bil
  ResponseString += "Account\n"
  ResponseString += `🏠 Address: ${Account}\n`
  ResponseString += `💲 Balance: $${TheirBal*SolVal} | ◎ Sol: ${TheirBal}\n`
  const OpenPositions = await GetTokens(Account);
  
  ResponseString += "\n====📊 Open Positions====\n"
  let specialTokens = [];
  let regularTokens = [];
  let pumpTokens = [];
  
  for (let Mint in OpenPositions) {
    const Amount = OpenPositions[Mint];
    if (Amount) {
      const SpecialToken = SpecialTokens[Mint];
      let PreMoji = "🪙";
      if (SpecialToken) {
        Mint = SpecialToken;
        PreMoji = "✨";
        specialTokens.push({ PreMoji, Mint, Amount });
        continue;
      }
      if (IsPumpCoin(Mint)) {
        PreMoji = "💊";
        pumpTokens.push({ PreMoji, Mint, Amount });
        continue;
      }
      regularTokens.push({ PreMoji, Mint, Amount });
    }
  }
  specialTokens.sort((a, b) => b.Amount - a.Amount);
  regularTokens.sort((a, b) => b.Amount - a.Amount);
  pumpTokens.sort((a, b) => b.Amount - a.Amount);
  const allTokens = [...specialTokens, ...regularTokens, ...pumpTokens];
  for (const token of allTokens) {
    ResponseString += `${token.PreMoji} ${token.Mint}: ${token.Amount}\n`;
  }
  
  // TODO: Split ResponseString into pages if needed
  
  ResponseString += "=======================\n"
  ResponseString += "```"
  return ResponseString;
}
async function checkTokenBalances(signature, TransType, Addy, logs, deep) {
  let Diagnosed = false
  if (deep >= 8) {
    console.log("max retries for changes logged exceeded")
    return
  }
  try {
    const TheirLastTokens = targetWallets[Addy][2]
    const TheirCurrentTokens = await GetTokens(Addy, TheirLastTokens);
    if (AreDictionariesEqual(TheirLastTokens, TheirCurrentTokens) && deep == 0) {
      console.log("no change in wallet detected. Retrying", deep + 1)
      await checkTokenBalances(signature, TransType, Addy, logs, deep + 1)
      return
    } else {
      if (deep != 0) {
        console.log("deepness: ", deep)
      }
    }
    const WalletFactor = targetWallets[Addy][0]
    for (const mint in TheirCurrentTokens) {
      const CurrentMintAmount = TheirCurrentTokens[mint]
      const LastMintAmount = TheirLastTokens[mint]
      if (mint in TheirLastTokens) {
        const balanceChange = CurrentMintAmount - LastMintAmount
        const transactionType = inferTransactionType(balanceChange);
        if (transactionType !== 'no change') {
          if (SpecialTokens[mint]) {
            Diagnosed = true
            continue
          }
          if (transactionType == "buy") {
            // token amount IN MINT
            const HowManyTokensToBuy = balanceChange * WalletFactor
            console.log("mint comparison: ", CurrentMintAmount, LastMintAmount, TheirLastTokens, TheirCurrentTokens)
            console.log(GetTime(), "BUYING", HowManyTokensToBuy, balanceChange, WalletFactor, logs)

            const SwapData = {
              transactionType: "buy",
              mintAddress: mint,
              AmountOfTokensToSwap: HowManyTokensToBuy,
              Wallet: Addy,
              Signature: signature,
              logs: logs,
              AmountTheyreBuying: CurrentMintAmount,
            }
            await enqueueSwap(SwapData);
            Diagnosed = true
          } else if (transactionType == "sell") {
            // token amount IN MINT
            const FactorSold = Math.abs(balanceChange) / LastMintAmount
            const MyTokenAmountSelling = MyTokens[mint] * FactorSold || 0
            console.log(balanceChange, LastMintAmount, MyTokens, FactorSold, MyTokenAmountSelling, null, logs)
            console.log(GetTime(), "SELLING", MyTokenAmountSelling, mint)

            const SwapData = {
              transactionType: "sell",
              mintAddress: mint,
              AmountOfTokensToSwap: MyTokenAmountSelling,
              Wallet: Addy,
              Signature: signature,
              logs: logs,
              FactorSold: FactorSold,
            }

            await enqueueSwap(SwapData);
            Diagnosed = true
          }
        }
      } else {
        //Token amount IN MINT
        const HowManyTokensToBuy = CurrentMintAmount * WalletFactor
        console.log(HowManyTokensToBuy, SolVal, CurrentMintAmount, WalletFactor, mint)
        console.log(GetTime(), "BUYING INITIAL", HowManyTokensToBuy)

        const SwapData = {
          transactionType: "buy",
          mintAddress: mint,
          AmountOfTokensToSwap: HowManyTokensToBuy,
          Wallet: Addy,
          Signature: signature,
          logs: logs,
          AmountTheyreBuying: CurrentMintAmount,

        }

        await enqueueSwap(SwapData);
        Diagnosed = true

      }
    }
    for (const mint in TheirLastTokens) {
      if (TheirCurrentTokens[mint] == null) {
        const AllMyMint = MyTokens[mint] || 0;
        console.log(GetTime(), "SELLING ALL", AllMyMint);

        const SwapData = {
          transactionType: "sell",
          mintAddress: mint,
          AmountOfTokensToSwap: AllMyMint,
          Wallet: Addy,
          Signature: signature,
          logs: logs,
          FactorSold: 1,
        }
        await enqueueSwap(SwapData);
        Diagnosed = true;
      }
    }
    targetWallets[Addy][2] = TheirCurrentTokens
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn('Encountered 429 Too Many Requests. slow down.');
    } else {
      console.error('Unexpected error during token balance check:', error);
    }
  }
  if (!Diagnosed) {
    console.log("?no change? retrying", TransType, logs, GetTime(), deep + 1)
    await checkTokenBalances(signature, TransType, Addy, logs, deep + 1)
    return
  }



}

function handleTradeEvent(signature, TransType, Address, logs) {
  if (!CompletedCopies.includes(signature)) {
    checkTokenBalances(signature, TransType, Address, logs, 0)

  } else {
    console.log("FOR SOME REASON GEEKED")
  }
}

function GetWalletEmbed(Name, Wallet) {
  return `[${Name}](${WalletCheckBaseAddress + Wallet})`
}
function GetMintEmbed(Name, Mint) {
  return `[${Name}](${MintCheckBaseAddress + Mint})`
}
function GetSignatureEmbed(Name, Signature) {
  return `[${Name}](${SigCheckBaseAddress + Signature})`
}
function LoadDB(Database) {
  const Path = "./db/logs/" + Database
  console.log(Path)
  if (fs.existsSync(Path)) {
    const data = fs.readFileSync(Path);
    let trades = JSON.parse(data);
    return trades
  } else {
    console.log("file does not exist")
  }
}



function AddData(Database, NewData) {
  const Path = "./db/logs/" + Database
  console.log(Path)
  const data = fs.readFileSync(Path);

  Info = JSON.parse(data);
  Info.push(NewData)
  console.log("Adding Data: ", NewData)
  fs.writeFileSync(Path, JSON.stringify(Info, null, 2));
}

async function enqueueSwap(SwapData) {
  const Wallet = SwapData.Wallet
  const FactorSold = SwapData.FactorSold
  const Signature = SwapData.Signature
  let NumTokens = SwapData.AmountOfTokensToSwap

  if (CompletedCopies.includes(Signature)) { //TODO make it shift and clear old signatures
    console.log("duplicate transaction detected. skipping")
    return
  }
  CompletedCopies.push(Signature)

  /*  STRUCTURE FOR TRADE DATABASE
  Data = {
    Time = GetTime(),
    Wallet = Wallet address,
    Type = Type of transaction (Buy or sell),
    Mint = Mint address of coin traded,
    Cost = Cost of coin at that moment in time,
    Amount = amount of tokens bought or sold,
    }
*/

  const InfoMapping = {
    0.25: "a quater of their position of the mint",
    0.5: "half of their position of the mint",
    0.75: "two thirds of their position of the mint",
    1: "all of their mint position of the mint",
  }
  const InfoSelling = InfoMapping[FactorSold] ? InfoMapping[FactorSold] : FactorSold * 100 + "% of their mint"

  const RoundedAmount = roundToDigits(FactorSold, 5)
  const RoundedTheyreBuying = Math.floor(SwapData.AmountTheyreBuying + 0.5)
  const ExtraInfo = SwapData.transactionType == "sell" ? `(${RoundedAmount * 100}%)` : `(${RoundedTheyreBuying})`
  const Emoji = SwapData.transactionType == "buy" ? "🟢" : "🔴"
  let DetectionMessage = `${Emoji} Detected a *${SwapData.transactionType}* at ${GetTime(true)} ${ExtraInfo}\n ${GetWalletEmbed("Wallet", Wallet)} ${GetMintEmbed("Mint", SwapData.mintAddress)} ${GetSignatureEmbed("Solscan", Signature)}`

  const ToGo = "🟡"
  const Done = "🟢"
  const Fail = "🔴"
  let NumChecksPassed = 0
  const DescriptionMapping = [
    "Pump Token Check",
    "Market Cap Check",
    "Minimum Spending Check",
    "Maximum Spending Check"
  ]
  let NumChecks = DescriptionMapping.length
  function GetStatus(FailedAt) {
    let str = ""
    for (let i = 0; i < NumChecks; i++) {

      str += (i == FailedAt ? Fail : (i < NumChecksPassed ? Done : ToGo)) + " - " + DescriptionMapping[i] + "\n"
    }
    return str
  }

  if (!IsPumpCoin(SwapData.mintAddress)) {
    const NotPumpMessage = `⚠️ ${GetMintEmbed("Mint", SwapData.mintAddress)} is not a pump token; trade skipped`
    DetectionMessage += "\n" + NotPumpMessage
    SendToAll(DetectionMessage, "Markdown");
    return
  }

  if (SwapData.transactionType === "buy") {
    const tokenPriceInUsd = await GetPrice(SwapData.mintAddress);
    const MarketCap = tokenPriceInUsd * Bil;
    const FactorOfMarketCap = (SwapData.AmountTheyreBuying * tokenPriceInUsd) / MarketCap;
    const CostInUsd = (NumTokens * tokenPriceInUsd)
    console.log("cost in usd: ", CostInUsd)
    if (!tokenPriceInUsd) {
      const CouldntGetPriceMessage = `🚫 Could not fetch price for ${GetMintEmbed("mint", SwapData.mintAddress)}; trade skipped.`
      DetectionMessage += "\n" + CouldntGetPriceMessage
      SendToAll(DetectionMessage, "Markdown");
      return;
    }
    if (FactorOfMarketCap > SetParameters.MaxMarketCap) {
      const ExceededMarketCapMessage = `⚠️ Exceeded market cap proportion; trade skipped (${roundToDigits(FactorOfMarketCap * 100, 3)}%)`
      DetectionMessage += "\n" + ExceededMarketCapMessage
      SendToAll(DetectionMessage, "Markdown");
      return;
    }
    const ProportionSpending = CostInUsd / (myWalletBalanceInSol * SolVal)
    const MaxAmountSpendingInUsd = myWalletBalanceInSol * SolVal * SetParameters.MaxProportionSpending
    if (ProportionSpending > SetParameters.MaxProportionSpending) {
      NumTokens = MaxAmountSpendingInUsd / tokenPriceInUsd
      const MaxProportionExceededMessage = `🔶 Max spending proportion exceeded (${ProportionSpending * 100}%); setting amount purchasing to ${SetParameters.MaxProportionSpending * 100}%`
      DetectionMessage += "\n" + MaxProportionExceededMessage
    }
    if (CostInUsd < SetParameters.MinimumSpending) {
      const BelowMinimumSpendingMessage = `⚠️ Below minimum spending; trade skipped ($${ToDecimalString(CostInUsd)})`
      DetectionMessage += "\n" + BelowMinimumSpendingMessage
      SendToAll(DetectionMessage, "Markdown");
      return;
    }
  } else if (SwapData.transactionType === "sell") {
    const balance = MyTokens[SwapData.mintAddress] || 0;
    if (balance <= 0) {
      const NoTokensMessage = `🪙 No tokens available for ${GetMintEmbed("mint", SwapData.mintAddress)}; swap skipped.`
      DetectionMessage += "\n" + NoTokensMessage
      SendToAll(DetectionMessage, "Markdown");
      return;
    }
    if (ConsecutiveSells[SwapData.mintAddress] >= ConsecutiveSellsThreshold) {
      NumTokens = MyTokens[SwapData.mintAddress];
      //TODO Add timeframe if actually implementing
    }
  }

  const PassedChecksMessage = `✅ Passed all checks for ${GetMintEmbed("mint", SwapData.mintAddress)}`
  DetectionMessage += "\n" + PassedChecksMessage
  if (Simulating) {
    if (!NumTokens) {
      console.log("invalid amount of tokens to log: ", NumTokens, GetTime(), Wallet, SwapData.mintAddress)
      return
    }
    const AddedSimulationSeconds = 10
    setTimeout(() => {
      GetPrice(SwapData.mintAddress).then(result => {
        if (!result) {
          if (SwapData.transactionType == "buy") {
            return
          } else {
          }
        }
        let Data = {}
        Data.Cost = parseFloat(result)
        Data.Amount = NumTokens
        Data.Wallet = Wallet
        Data.Type = SwapData.transactionType
        Data.Mint = SwapData.mintAddress
        Data.Time = GetTime()
        AddData("OurTrades.json", Data)
        let Message = `🔵 Simulated a *${SwapData.transactionType}* at ${GetTime(true)} copying wallet: ${GetWalletEmbed(Wallet, Wallet)} for mint: ${GetMintEmbed(SwapData.mintAddress, SwapData.mintAddress)} ${Emoji}`
        SendToAll(Message, "MarkdownV2")
        if (SwapData.transactionType == "buy") {
          MyTokens[SwapData.mintAddress] = MyTokens[SwapData.mintAddress] || 0
          MyTokens[SwapData.mintAddress] += NumTokens
          SimulatingStartAmountUSD -= NumTokens * Data.Cost
        } else {
          if (MyTokens[SwapData.mintAddress]) {
            MyTokens[SwapData.mintAddress] -= NumTokens
            SimulatingStartAmountUSD += NumTokens * Data.Cost
          }
        }
        UpdateMyWallet()
      })
    }, AddedSimulationSeconds * 1000);
    return
  }

  if (SetParameters.Halted && SwapData.transactionType == 'buy') {
    const HaltedMessage = `🛑 Buying is halted; didn't buy ${GetMintEmbed("mint", SwapData.mintAddress)}`
    DetectionMessage += "\n" + HaltedMessage
    SendToAll(DetectionMessage, "Markdown")
    return
  }
  SendToAll(DetectionMessage, "Markdown")
  let Data = {}

  Data.Amount = NumTokens
  Data.Wallet = Wallet
  Data.Type = SwapData.transactionType
  Data.Mint = SwapData.mintAddress
  Data.Time = GetTime()

  let ParsedSignature = undefined
  let MaxNumRetrying = MaxRetries
  if (SwapData.transactionType == "buy") {
    MyTokens[SwapData.mintAddress] = MyTokens[SwapData.mintAddress] ? MyTokens[SwapData.mintAddress] : 0
    MyTokens[SwapData.mintAddress] += NumTokens //! imaginary tokens
    MaxNumRetrying = 1
  }

  for (let i = 1; i < MaxNumRetrying; i++) {
    const AmountSwapping = NumTokens // amount in number of tokens 
    const { Signature, Successful, logs } = await handleSwap(SwapData.mintAddress, AmountSwapping, SwapData.transactionType);
    ParsedSignature = Signature
    Data.Signature = Signature
    Data.MyLogs = logs
    console.log("swapped. Status: ", Successful)
    if (!Successful) { //! failed to buy
      if (SwapData.transactionType == "sell") {
        console.log(`failed to sell. retrying`)
      } else {
        // buy
        console.log("key stuff", logs)
        try {
          console.log(Object.keys(logs.err)[0])

        } catch (e) {
          console.log("couldnt log error: ", e)

        }
        MyTokens[SwapData.mintAddress] -= NumTokens //! removing imaginary tokens
        const err = "unknown error"
        const Message = `🚫 Failed to execute buy at ${GetTime(true)} ${Emoji}\n ${GetWalletEmbed("Wallet", Wallet)} ${GetMintEmbed("Mint", SwapData.mintAddress)} ${GetSignatureEmbed("Solscan", Signature)}\n Error: ${Object.keys(err)}` //TODO make it log error
        SendToAll(Message, "Markdown")
        Data.Successful = false
        AddData("OurOrders.json", Data)
        return
      }
    } else { //Successfull buy
      console.log("did operation successfully")
      if (SwapData.transactionType == "buy") {
        ConsecutiveSells[SwapData.mintAddress] = 0
      } else {
        if (!ConsecutiveSells[SwapData.mintAddress]) {
          ConsecutiveSells[SwapData.mintAddress] = 1
        } else {
          ConsecutiveSells[SwapData.mintAddress] += 1
        }
        MyTokens[SwapData.mintAddress] -= NumTokens
      }
      break
    }
    if (i == MaxRetries) {
      const Message = `🚫 Failed to ${SwapData.transactionType}`
      SendToAll(Message, "Markdown")
      return
    }
  }
  Data.Successful = true
  AddData("OurOrders.json", Data)

  const ExecutedMessage = `🛒 Executed a *${SwapData.transactionType}* at ${GetTime(true)} ${Emoji}\n ${GetWalletEmbed("Wallet", Wallet)} ${GetMintEmbed("Mint", SwapData.mintAddress)} ${GetSignatureEmbed("Solscan", ParsedSignature)} `
  //TODO make it so that it replies to the message above
  SendToAll(ExecutedMessage, "Markdown")
}


async function handleSwap(Mint, InpAmount, transactionType) {
  const Signature = await Swap(Mint, InpAmount, 40, SetParameters.PriorityFee, transactionType)
  console.log("InpAmount: ", InpAmount)
  console.log("signature: ", Signature)
  let Successful = false
  let logs = {}
  if (!Signature) {
    return { Signature, Successful, logs }
  }
  await new Promise((resolve) => {
    Events.once('AnalysisLogsAdded', (key) => {
      if (key === Signature) resolve();
    });
  });

  const MyAnalysis = MyWalletAnalysis[Signature]
  logs = MyAnalysis.logs
  if (findMatchingStrings(logs, ["Error", "panicked"], true) || MyAnalysis.err) {
    return { Signature, Successful, MyAnalysis }
  } else {
    console.log("successfully went through C:")
    Successful = true
    return { Signature, Successful, MyAnalysis }
  }
}

const SOLANA_RPC_ENDPOINTS = [ //TODO make it so that this is a universal variable
  "https://api.mainnet-beta.solana.com",
  "https://rpc-mainnet.solanatracker.io/?api_key=81b71925-ca06-487c-ac6c-155d8a9e3cda",
  "https://solana-rpc.publicnode.com/",
  "https://solana-mainnet.core.chainstack.com/155d8d316c41d2ab16e07ee9190e409c",
  "https://mainnet.helius-rpc.com/?api-key=62867695-c3eb-46cb-b5bc-1953cf48659f",
  "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7",
  "https://virulent-few-dawn.solana-mainnet.quiknode.pro/272b003581d3e1ec81ab5ccf9f7a8008cb0453ec",
  "https://public.ligmanode.com",
];

const connections = {};
SOLANA_RPC_ENDPOINTS.forEach((endpoint, index) => {
  connections[index] = new Connection(endpoint, { commitment: 'confirmed' });
});

let LoggedSignature = [];
let subscriptions = {};
async function UpdateWalletFactor(WalletAdd) {
  const WalletSize = await getWalletBalance(WalletAdd);
  const CurrentWalletFactor = Math.min(myWalletBalanceInSol / WalletSize, 1);
  targetWallets[WalletAdd][0] = CurrentWalletFactor;
  targetWallets[WalletAdd][3] = WalletSize;
  console.log(`Wallet update for ${WalletAdd}: `, myWalletBalanceInSol, WalletSize);
}
function subscribeToWalletTransactions(WalletAdd) {
  const CurrWalletPubKey = new PublicKey(WalletAdd);
  for (const index in connections) {
    const connection = connections[index];
    const id = connection.onLogs(CurrWalletPubKey, async (logs, ctx) => {
      if (!targetWallets[WalletAdd]) {
        connection.removeOnLogsListener(subscriptions[WalletAdd][index]);
        return;
      }
      if (!SolVal) {
        //! no solvalue; wil break
        return
      }
      if (!StartedLogging) {
        targetWallets[WalletAdd][2] = await GetTokens(WalletAdd);
        return;
      }
      if (LoggedSignature.includes(logs.signature)) {
        return;
      }
      if (LoggedSignature.length > MAX_SIGNATURES) {
        LoggedSignature.shift()
      }
      const ToSearchFor = [
        `Program log: Instruction: PumpSell`,
        `Program log: Instruction: PumpBuy`,
        `Program log: Instruction: CloseAccount`,
        `Program log: Create`,
        `Program log: Instruction: Sell`,
        `Program log: Instruction: Buy`
      ];
      const InString = findMatchingStrings(logs.logs, ToSearchFor, false);
      if (InString && !logs.err) {
        LoggedSignature.push(logs.signature)
        console.log(WalletAdd, "good data: ", logs);
        handleTradeEvent(logs.signature, InString, WalletAdd, logs.logs);
      } else {
        console.log("Useless data: ", logs.signature);
      }
    }, 'confirmed');
    if (!subscriptions[WalletAdd]) {
      subscriptions[WalletAdd] = {};
    }
    subscriptions[WalletAdd][index] = id;
  }
  UpdateWalletFactor(WalletAdd);
}


process.on('SIGINT', async () => {
  console.info('Received SIGINT. Shutting down at ', GetTime());

  for (const wallet in subscriptions) {
    for (const index in subscriptions[wallet]) {
      await connections[index].removeOnLogsListener(subscriptions[wallet][index]);
    }
  }


  process.exit(0);
});

async function AddWallet(Wallet, Alias = "", InitialFetch, NumWalletsTotal) {
  if (!InitialFetch) {
    EditValue("TargetWallets", GetData("TargetWallets").length, Wallet)
  }

  const WalletSize = await getWalletBalance(Wallet)
  const CurrentWalletFactor = Math.min(await myWalletBalanceInSol / WalletSize, 1)
  const TheirLastTokens = await GetTokens(Wallet);

  /*
    if (InitialFetch) {
      NumWalletsAdded += 1
  
      const Progress = roundToDigits(NumWalletsAdded / NumWalletsTotal, 2)
      const PlaceEnding = Math.floor(BarSize * Progress + 0.5)
      let ProgressString = "\\["
      for (let x = 1; x < BarSize + 1; x++) {
        ProgressString += x <= PlaceEnding ? Filled : Unfilled
      }
      const EstimatedTimeLeft = (NumWalletsTotal - NumWalletsAdded) * 6
      ProgressString += `\] ${Progress * 100}%\n ETA: ${EstimatedTimeLeft} seconds`
      console.log(ProgressString)
      if (NumWalletsAdded == NumWalletsTotal) {
        StartedLogging = true
        let StartInidicator = SetParameters.Halted ? "🟨" : "🟩"
        const Msg = StartInidicator + SetParameters.Halted ? "Finished adding wallets. Bot is halted" : "Finished adding wallets. Bot is active" + StartInidicator
        for (id in IDToName) {
          //SendStandaloneMessage((id).toString(), Msg, "Markdown", "editMessageText", InitialMessageIDForEach[id].toString())
        }
      } else {
        for (id in IDToName) {
          //SendStandaloneMessage((id).toString(), ProgressString, "Markdown", "editMessageText", InitialMessageIDForEach[id].toString())
  
        }
      }
    }
    */
  StartedLogging = true
  targetWallets[Wallet] = [CurrentWalletFactor, null, TheirLastTokens, WalletSize, Alias,]
  subscribeToWalletTransactions(Wallet);
}

async function main() {
  MyTrades = LoadDB("OurTrades.json")
  console.log(MyTrades)
  MyTokens = await GetTokens(MyWalletPubKey)
  UpdateMyWallet()
  const data = fs.readFileSync(BaseFilePath + "Values.json");
  Info = JSON.parse(data);
  SetParameters = Info
  const walletdata = fs.readFileSync(BaseFilePath + "TargetWallets.json");
  const Arr = JSON.parse(walletdata)
  const Msg = `Starting bot. Adding ${Arr.length} wallets`
  SendToAll(Msg, "Markdown", "sendMessage") //TODO make it so that it sends keyboard 
  for (const i in Arr) {
    const newWallet = Arr[i]
    if (isEthereumOrSolanaAddress(newWallet)) {
      console.log("adding new wallet: ", newWallet)
      AddWallet(newWallet, null, true)
    }
  }

  console.log(`Started monitoring at ${GetTime()}`)
}
main()


const http = require('http');

const PORT = process.env.PORT || 3000;
const WebIP = process.env.WebIP
const app = express();
app.use(express.json());
app.post('*', async (req, res) => {
  let Body = req.body;
  console.log(req.body)
  if (Body.message) {
    let ID = Body.message.from.id;
    let Text = Body.message.text;
    console.log(`Received message: "${Text}" from ID: ${ID}`);
    handleMessage(Body.message);
    res.send("Hello post");
  }
});
app.get('*', async (req, res) => {
  res.send("t.me/nappa2");
});
const server = http.createServer(app);
server.listen(PORT, WebIP, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log(`Server listening on PORT ${PORT}`);
  }
});
server.keepAliveTimeout = 24 * 60 * 60 * 1000
server.headersTimeout = 24 * 60 * 60 * 1000 + 1000
setInterval(() => {
  fetch(`http://${WebIP}:${PORT}`, { method: 'POST' })
    .then(() => console.log('Self-ping succeeded.'))
    .catch((err) => console.error('Self-ping failed:', err));
}, 10 * 1000)


const BASE_URL = `https://api.telegram.org/bot${TelegramKey}/`; //TODO make it so that sending messages is rate limited
function getAxiosInstance() {
  return {
    get(method, params) {
      return axios.get(`/${method}`, {
        baseURL: BASE_URL,
        params,
      });
    },
    post(method, data) {
      return axios({
        method: 'post',
        baseURL: BASE_URL,
        url: `/${method}`,
        data,
      });
    },
  };
}

async function SendToAll(text, Mode = "Markdown", Method = "sendMessage", MessageToEdit) {
  console.log(text, Mode)
  for (const chatId in IDToName) {
    const data = await SendStandaloneMessage(chatId, text, Mode, Method, MessageToEdit)
    if (!InitialMessageIDForEach[chatId]) {
      const MID = await data.data.result.message_id
      InitialMessageIDForEach[chatId] = MID
    }
  }
}

async function SendStandaloneMessage(chatId, text, Mode, Method, MessageID) {
  const url = `https://api.telegram.org/bot${TelegramKey}/${Method}`;
  try {
    const Input = {
      chat_id: chatId,
      text: text,
      parse_mode: Mode,
      message_id: MessageID,
    }
    if (Method == "sendMessage") {
      Input.disable_web_page_preview = true
    }
    const data = await axios.post(url, Input);
    return data
    // console.log("Message sent:", text);
  } catch (error) {
    console.log(
      error,
    );
  }
}


function GetKeyBoard(Options, Resize, OTK) {
  const KB = {
    keyboard: [
      Options,
    ],
    resize_keyboard: Resize,
    one_time_keyboard: OTK,
    is_persistent: true
  };
  return KB

}
function GetData(Database) {
  const path = BaseFilePath + Database + ".json"
  const data = fs.readFileSync(path);
  Info = JSON.parse(data);
  return Info
}
function ClearJsonArray(Database) {
  const path = BaseFilePath + Database + ".json"
  fs.writeFileSync(path, JSON.stringify([], null, 2));
}
function RemoveValue(Database, Value) {//! must be array
  const path = BaseFilePath + Database + ".json"
  const data = fs.readFileSync(path);
  Info = JSON.parse(data);
  const index = Info.indexOf(Value);
  Info.splice(index, 1)
  fs.writeFileSync(path, JSON.stringify(Info, null, 2));
}
function EditValue(Database, Key, Value) {
  const path = BaseFilePath + Database + ".json"
  const data = fs.readFileSync(path);
  Info = JSON.parse(data);
  Info[Key] = Value
  fs.writeFileSync(path, JSON.stringify(Info, null, 2));
}

async function sendMessage(ID, messageText, Mode = "Markdown", Keyboard, Method = "sendMessage") { //TODO make it so that it retries if sending message failed
  async function ReturnAxios(deep) {
    try {
      return getAxiosInstance().get(Method, {
        chat_id: ID,
        text: messageText,
        parse_mode: Mode,
        reply_markup: JSON.stringify(Keyboard),
        disable_web_page_preview: true,
      });
    } catch {
      if (deep >= 4){
        console.error("couldnt send message :(")
        return 
      }
      deep += 1
      return await ReturnAxios(deep)
    }
  }
    return ReturnAxios(0)
}

const userStates = {}; // Store states for each user
async function handleMessage(messageObj) {
  const chatId = messageObj.chat.id;
  const ActionAliases = {
    "🔍 Scan again": "scanner",

  }

  const ActionTexts = {
    "back": "🔙 Back",
    "info": "ℹ️ Info",
    "mybal": "💰 Get Balance",
    "settings": "⚙️ Settings",
    "actions": "📋 Actions",
    "changepriofee": "💸 Change Priority Fee",
    "changemaxpropspending": "⚖️ Change Max Proportion Spending",
    "changemaxpermc": "🧢 Change Max Percent of Market Cap",
    "changeminimumspending": "🔻 Change Minimum Amount Spending",
    "getpriofee": "💸 Get Priority Fee",
    "getmaxpropspending": "⚖️ Get Max Proportion spending",
    "getminspending": "🔻 Get Minimum Amount Spending",
    "getmaxpermc": "🧢 Get Max Percent of Market Cap",
    "sellall": "💰 Sell All",
    "halt": "⏸️ Halt",
    "resume": "▶️ Resume",
    "message": "✉️ Message",
    "managewallets": "💳 Wallets",
    "walletdetails": "💼 Wallet Details",
    "addwallet": "➕ Add Wallet",
    "removewallet": "➖ Remove Wallet",
    "importwallets": "📥 Import Wallets",
    "clearwallets": "❌ Clear Wallets",
    "confirmation": "✔️ Yes",
    "walletgen": "🗝️ Generate Wallet",
    "getconditions": "📝 Get Conditions",
    "changeconditions": "🔨 Change Conditions",
    "tools": "🛠️ Tools",
    "scanner": "🔍 Scanner",
  }

  if (!IDToName[chatId]) {
    return sendMessage(chatId, "Your telegram ID isn't whitelisted; tell @Nappa2 that he is demure so that he will whitelist you")
  }
  const StartOptions = [
    { text: ActionTexts["info"] },
    { text: ActionTexts["settings"] },
    { text: ActionTexts["actions"] },
    { text: ActionTexts["managewallets"] },
    { text: ActionTexts["tools"] },
  ]
  const messageText = messageObj.text || "";
  if (!ActionTexts[messageText]){
    const UsedAlias = ActionAliases[messageText]
    if (UsedAlias){
      messageText = UsedAlias 
    }
  }
  

  if (userStates[chatId]) { //TODO make this better managed
    if (userStates[chatId].waitingForFee) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForFee = false;
        return ReturnToMenu()
      }
      const newFee = parseFloat(messageText);
      if (isNaN(newFee)) {
        sendMessage(chatId, "Invalid number.");
        userStates[chatId].waitingForFee = false;

      } else {
        SetParameters.PriorityFee = newFee
        userStates[chatId].waitingForFee = false;
        EditValue("Values", "PriorityFee", newFee)
        SendToAll(`Priority fee changed to ${newFee}.`)
      }
      ReturnToMenu()
      return;
    } else if (userStates[chatId].waitingForWalletAddress) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForWalletAddress = false;
        return ReturnToMenu()
      }

      const splitStrings = messageText.includes(" - ")
        ? messageText.split(" - ")
        : [messageText, ""];
      const Address = splitStrings[0];
      const Alias = splitStrings[1];
      if (!isEthereumOrSolanaAddress(Address)) {
        sendMessage(chatId, "Invalid Address");
        userStates[chatId].waitingForWalletAddress = false;
        return
      }

      if (targetWallets[Address]) {
        userStates[chatId].waitingForWalletAddress = false;
        sendMessage(chatId, "Address already added");
        ReturnToMenu()
        return
      }
      AddWallet(Address, Alias)
      userStates[chatId].waitingForWalletAddress = false;
      SendToAll(`Added wallet: ${Address}.`)
      ReturnToMenu()
      return
    } else if (userStates[chatId].waitingForWalletAddressToRemove) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForWalletAddressToRemove = false;
        return ReturnToMenu()
      }
      const removing = messageText
      if (!targetWallets[removing]) {
        sendMessage(chatId, "Enter a valid wallet address to remove.");
        userStates[chatId].waitingForWalletAddressToRemove = false
      } else {
        delete targetWallets[removing]
        RemoveValue("TargetWallets", removing)
        userStates[chatId].waitingForWalletAddressToRemove = false;
        SendToAll(`Removed wallet: ${removing}.`)
      }
      ReturnToMenu()
      return
    } else if (userStates[chatId].waitingForWalletToView) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForWalletToView = false;
        return ReturnToMenu()
      }
      const Viewing = messageText
      if (!targetWallets[Viewing]) {
        sendMessage(chatId, "Enter a valid wallet address to appraise.");
        userStates[chatId].waitingForWalletToView = false
      } else {
        userStates[chatId].waitingForWalletToView = false;
        sendMessage(chatId, `Getting details for wallet: ${GetWalletEmbed(Viewing, Viewing)}`);
        const TheirBal = await getWalletBalance(Viewing)
        let FormattedResponseStr = "```" //! include pnl, latest trade, balance, and give it a rating to copytrade
        FormattedResponseStr += `Balance: $${TheirBal*SolVal}`



        sendMessage(chatId, TheirBal)
      }
      ReturnToMenu()
      return
    } else if (userStates[chatId].waitingForGCMessage) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForGCMessage = false;
        return ReturnToMenu()
      }
      const UserName = IDToName[chatId]
      const Msg = `[${UserName}] sent the message: ${messageText}`
      SendToAll(Msg)
      userStates[chatId].waitingForGCMessage = false;
      ReturnToMenu()
      return
    } else if (userStates[chatId].waitingForWalletAddresses) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForWalletAddresses = false;
        return ReturnToMenu()
      }
      const newWallets = messageText
      const Arr = newWallets.split('\n');
      for (const i in Arr) {
        const newWallet = Arr[i]
        console.log(newWallet)
        if (!isEthereumOrSolanaAddress(newWallet)) {
          sendMessage(chatId, "Invalid Address; skipping");
          continue
        } else {
          if (targetWallets[newWallet]) {
            sendMessage(chatId, "Address already added");
            continue
          }
          AddWallet(newWallet)
          SendToAll(`Added wallet:\n${newWallet}.`)
        }
      }
      userStates[chatId].waitingForWalletAddresses = false;
      ReturnToMenu()
      return

    } else if (userStates[chatId].waitingForProportion) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForProportion = false;
        return ReturnToMenu()
      }

      const NewMax = parseFloat(messageText.replace('%', '')) / 100;
      if (isNaN(NewMax) && NewMax > 0 && NewMax <= 1) {
        sendMessage(chatId, "Invalid number.");
        userStates[chatId].waitingForProportion = false;
      } else {
        SetParameters.MaxProportionSpending = NewMax
        userStates[chatId].waitingForProportion = false;
        EditValue("Values", "MaxProportionSpending", NewMax)

        SendToAll(`Max proportion changed to ${NewMax * 100}%.`)
      }
      ReturnToMenu()
      return;
    } else if (userStates[chatId].waitingForMinimum) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForMinimum = false;
        return ReturnToMenu()
      }
      const NewMin = parseFloat(messageText);
      if (isNaN(NewMin)) {
        sendMessage(chatId, "Invalid number.");
        userStates[chatId].waitingForMinimum = false;
      } else {
        SetParameters.MinimumSpending = NewMin
        userStates[chatId].waitingForMinimum = false;
        EditValue("Values", "MinimumSpending", NewMin)

        SendToAll(`Minimum spent changed to ${NewMin} USD.`)
      }
      ReturnToMenu()
      return;
    } else if (userStates[chatId].waitingToClearAll) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingToClearAll = false;
        return ReturnToMenu()
      } else if (messageText == ActionTexts["confirmation"]) {
        userStates[chatId].waitingToClearAll = false;
        ClearJsonArray("TargetWallets")
        targetWallets = {}
        SendToAll("Cleared all wallets.")
        ReturnToMenu()
        return
      } else {
        userStates[chatId].waitingToClearAll = false;
        ReturnToMenu()
        return
      }


    } else if (userStates[chatId].waitingForMCPerc) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForMCPerc = false;
        return ReturnToMenu()
      }

      const NewMax = parseFloat(messageText.replace('%', '')) / 100;
      if (isNaN(NewMax) && NewMax > 0 && NewMax <= 1) {
        sendMessage(chatId, "Invalid number.");
        userStates[chatId].waitingForMCPerc = false;
      } else {
        SetParameters.MaxMarketCap = NewMax
        userStates[chatId].waitingForMCPerc = false;
        EditValue("Values", "MaxMarketCap", NewMax)

        SendToAll(`Max Market Cap threshold changed to ${NewMax * 100}%.`)
      }
      ReturnToMenu()
      return;
    } else if (userStates[chatId].waitingForScanner) {
      if (messageText == ActionTexts["back"]) {
        userStates[chatId].waitingForScanner = false;
        return ReturnToMenu()
      }
      userStates[chatId].waitingForScanner = false
      const Input = messageText
      const Analysis = await AnalyseAccount(Input)
      console.log("analysis: ",Analysis)
      sendMessage(chatId, Analysis)
      ReturnToMenu()
      return 
    }
  }

  function ReturnToMenu() {
    return sendMessage(chatId, "Menu", null, GetKeyBoard(StartOptions, true, false))
  }
  if (messageText == "/start") {
    return ReturnToMenu()
  }
  function GetSettingsOptions(Halted) {
    let SettingsOptions = [
      { text: ActionTexts["changeconditions"] },
      { text: ActionTexts[Halted ? "resume" : "halt"] },
      { text: ActionTexts["back"] },
    ]
    return SettingsOptions
  }

  switch (messageText) {
    case ActionTexts["back"]:
      return ReturnToMenu()
    case ActionTexts["halt"]:
      EditValue("Values", "Halted", true)

      SendToAll("Halted trading. Logs will still come through");
      const HaltOptions = GetSettingsOptions(true)
      const HaltKB = GetKeyBoard(HaltOptions, true, false)
      SetParameters.Halted = 1;
      return sendMessage(chatId, "Settings: ", null, HaltKB)

    case ActionTexts["resume"]:
      EditValue("Values", "Halted", false)

      SendToAll("Resumed trading");
      const ResumeOptions = GetSettingsOptions(false)
      const ResumeKB = GetKeyBoard(ResumeOptions, true, false)
      SetParameters.Halted = 0;
      return sendMessage(chatId, "Settings: ", null, ResumeKB)

    case ActionTexts["changepriofee"]:
      sendMessage(chatId, "Enter the new priority fee:", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForFee: true };
      return;
    case ActionTexts["message"]:
      sendMessage(chatId, "Type the message", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForGCMessage: true };
      return
    case ActionTexts["changemaxpropspending"]:
      sendMessage(chatId, "Enter the new proportion you would be willing to spend on each transaction as a percentage. (eg. 10%)", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForProportion: true };
      return
    case ActionTexts["changeminimumspending"]:
      sendMessage(chatId, "Enter the smallest amount you will be willing to take for a transaction (USD)", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForMinimum: true };
      return
    case ActionTexts["changemaxpermc"]:
      sendMessage(chatId, "Enter the maximum percent of the market cap someone may own for you to ender the trade as a percentage (eg. 10%)", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForMCPerc: true };
      return

    case ActionTexts["addwallet"]:
      sendMessage(chatId, "Enter the wallet address:", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForWalletAddress: true };
      return;
    case ActionTexts["importwallets"]:
      sendMessage(chatId, "Enter the wallet addresses:", null, GetKeyBoard([ActionTexts["back"]], true, false)); //TODO make it say format and fix aliases
      userStates[chatId] = { waitingForWalletAddresses: true };
      return;
    case ActionTexts["clearwallets"]:
      sendMessage(chatId, "Are you sure you want to clear all wallets?", null, GetKeyBoard([ActionTexts["confirmation"], ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingToClearAll: true };
      return;
    case ActionTexts["removewallet"]:
      let WalletsToRemoveOptions = []
      Object.keys(targetWallets).forEach(key => {
        WalletsToRemoveOptions.push(key)
      });
      WalletsToRemoveOptions.push(ActionTexts["back"])
      userStates[chatId] = { waitingForWalletAddressToRemove: true };
      return sendMessage(chatId, "Enter the wallet address to remove: ", null, GetKeyBoard(WalletsToRemoveOptions, true, false));
    case ActionTexts["scanner"]:

      sendMessage(chatId, "Enter a wallet, mint, signature, SPL account etc", null, GetKeyBoard([ActionTexts["back"]], true, false));
      userStates[chatId] = { waitingForScanner: true };
      return
    case ActionTexts["walletdetails"]:
      let WalletsToSelectFrom = []
      Object.keys(targetWallets).forEach(key => {
        WalletsToSelectFrom.push(key)
      });
      WalletsToSelectFrom.push(ActionTexts["back"])
      userStates[chatId] = { waitingForWalletToView: true };
      return sendMessage(chatId, "Select a wallet to appraise: ", null, GetKeyBoard(WalletsToSelectFrom, true, false));
    case ActionTexts["walletgen"]:
      const keypair = Keypair.generate();
      const PubKey = keypair.publicKey.toBase58()
      const PrivKey = Buffer.from(keypair.secretKey).toString("hex")
      const msg = `💼 Wallet: \`\`\`${PubKey}\`\`\` \n 🗝️ Key: \`\`\`${PrivKey}\`\`\` ` //TODO make a rate limit for this
      sendMessage(chatId, msg, "MarkdownV2")
      return
    case ActionTexts["mybal"]:
      async function showbal() {
        sendMessage(chatId, `Getting balance for ${GetWalletEmbed("Wallet", MyWallet)}`, "MarkdownV2")
        const SolBal = roundToDigits(await myWalletBalanceInSol, 5);
        const USDBal = roundToDigits(await SolVal * myWalletBalanceInSol, 3)
        const AUDBal = roundToDigits(await AUDTOUSD(USDBal), 3)

        let BalanceMessage = `*💵 USD: ${USDBal}\n💸 AUD: ${AUDBal}\n💜 SOL: ${SolBal}`;
        if (Simulating) {
          BalanceMessage += `\n🤖 SIM: ${SimulatingStartAmountUSD}`
        }
        BalanceMessage += "*"
        console.log(BalanceMessage, "bm")
        return sendMessage(chatId, BalanceMessage);
      }
      await showbal();
      return
    case ActionTexts["getconditions"]:
      const data = fs.readFileSync(BaseFilePath + "Values.json", "utf8");
      let MsgStr = "\`\`\`json\n" + data + "\`\`\`"

      return sendMessage(chatId, MsgStr)
    case ActionTexts["getpriofee"]:
      const FeeMsg = "Priority fee: " + SetParameters.PriorityFee
      return sendMessage(chatId, FeeMsg);
    case ActionTexts["getmaxpropspending"]:
      const MaxMsg = "Max proportionate spending: " + SetParameters.MaxProportionSpending * 100 + "%"
      return sendMessage(chatId, MaxMsg);
    case ActionTexts["getminspending"]:
      const MinMsg = `Minimum amount spending (USD): $${SetParameters.MinimumSpending}`
      return sendMessage(chatId, MinMsg);
    case ActionTexts["getmaxpermc"]:
      const MCMsg = `Maximum percent of market cap: ${SetParameters.MaxMarketCap * 100}%`
      return sendMessage(chatId, MCMsg);
    case ActionTexts["changeconditions"]:
      const ConditionsOptions = [
        { text: ActionTexts["changemaxpermc"] },
        { text: ActionTexts["changemaxpropspending"] },
        { text: ActionTexts["changeminimumspending"] },
        { text: ActionTexts["changepriofee"] },
        { text: ActionTexts["back"] },
      ]
      const CondtionsKB = GetKeyBoard(ConditionsOptions, true, false)
      return await sendMessage(chatId, "Conditions: ", null, CondtionsKB)
    case ActionTexts["walletanalysis"]:
    

    return

    case ActionTexts["info"]:
      const InfoOptions = [
        { text: ActionTexts["mybal"] },
        { text: ActionTexts["getconditions"] },
        { text: ActionTexts["back"] },
      ]
      const InfoKB = GetKeyBoard(InfoOptions, true, false)
      return await sendMessage(chatId, "Info: ", null, InfoKB)
    case ActionTexts["tools"]:
          const ToolOptions = [
        { text: ActionTexts["scanner"] },
        { text: ActionTexts["back"] },
      ]
      const ToolKB = GetKeyBoard(ToolOptions, true, false)
      return await sendMessage(chatId, "Tools: ", null, ToolKB)

    case ActionTexts["actions"]:
      const ActionOptions = [
        { text: ActionTexts["walletgen"] },
        { text: ActionTexts["back"] },
      ]

      const ActionKB = GetKeyBoard(ActionOptions, true, false)
      return await sendMessage(chatId, "Actions: ", null, ActionKB)

    case ActionTexts["managewallets"]:
      const WalletsOptions = [
        { text: ActionTexts["addwallet"] },
        { text: ActionTexts["removewallet"] },
        { text: ActionTexts["importwallets"] },
        { text: ActionTexts["clearwallets"] },
        { text: ActionTexts["walletdetails"] },
        { text: ActionTexts["back"] },
      ]
      const WalletsKB = GetKeyBoard(WalletsOptions, true, false)

      let WalletString = `Wallets: ⟨${Object.keys(targetWallets).length}⟩\n`
      Object.keys(targetWallets).forEach(key => {
        const Alias = targetWallets[key][4]
        const PrePend = Alias ? Alias + ": " : "Account: "
        WalletString += (PrePend + GetWalletEmbed(GetShorthandVersion(key, 8), key, true) + "\n")

      });
      console.log(WalletString)
      return sendMessage(chatId, WalletString, "MarkdownV2", WalletsKB)

    case ActionTexts["settings"]:
      const SettingsOptions = [
        { text: ActionTexts["changeconditions"] },
        { text: ActionTexts[SetParameters.Halted ? "resume" : "halt"] },
        { text: ActionTexts["back"] },
      ]
      const SettingsKB = GetKeyBoard(SettingsOptions, true, false)

      return sendMessage(chatId, "Settings:", null, SettingsKB)

    default:
      return sendMessage(chatId, "That is not a command");
  }
}