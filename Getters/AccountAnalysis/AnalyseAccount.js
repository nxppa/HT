const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
const bs58 = require("bs58").default
Bil = 10**9
const { FetchSolVal } = require('../SolVal/JupiterV2.js');
const GetTokens = require("../TokenBalance/GetTokens.js")
const {getAsset} = require("../AssetInfo/Helius.js")
const {GetPrice} = require("../Price/Combination.js")
function IsPumpCoin(Mint) {
    return Mint.toLowerCase().endsWith("pump");
  }
const SOLANA_RPC_ENDPOINT = "https://flashy-radial-needle.solana-mainnet.quiknode.pro/1f355b50797c678551df08ed13bb94295ebebfc7" //TODO make it so that it uses multiple endpoints
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
  commitment: 'confirmed',
});

async function isValidEdwardsPoint(R) {
    try {
        const point = await ed25519.Point.fromHex(R); // Convert R to an Edwards point
        return !point.hasSmallOrder();
    } catch {
        return false; // If the conversion fails, R is not a valid point
    }
}
function SignatureSyntaxMatch(sig) {
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
    console.log(str)
    try {
        bs58.decode(str);
        return false
    } catch (e) {
        return true
    }
}

async function AnalyseAccount(Account, Connections) {
    let Response = {
        data: {},
        type: null
    }

    if (containsNonBase58Character(Account)) {
        return "Contains non base 58 character. Could not parse"
    }
    const Matches = SignatureSyntaxMatch(Account)
    if (Matches) { //! is signature
        const parsed = await ParseSignature(Account)
        Response.type = "Signature"
        Response.data.signature = Account
        if (parsed) {
            response.data.parsed = parsed 
        } else {
            return "couldnt get parsed transaction for signature"
        }
        return Response;
    }
    let publicKey = ""
    try {
        publicKey = typeof (Account) == "string" ? new PublicKey(Account) : Account
    } catch {
        return "invalid input"
    }
    const accountInfo = await connection.getParsedAccountInfo(publicKey)
    if (!accountInfo.value) {
        return "could not find data on account"
    }
    const data = accountInfo.value.data;
    if (!data || data === 'none') {
        return "account could not parsed";
    }
    const parsed = data.parsed;
    const program = data.program;
    if (program === 'spl-token') {
        if (parsed && parsed.type === 'mint') {
            Response.type = "Mint"
            Response.data.account = Account
            Response.data.tokenInfo = {}
            const MintInfo = await getAsset(Account)
            const Price = await GetPrice(Account)
            
            for (let k in MintInfo) {
                const Info = MintInfo[k]
                if (Info) {
                    Response.data.tokenInfo[k] = Info
                }
            }
            Response.data.price = Price
            Response.data.marketCap = Price*Bil
            return Response
        }
        if (parsed && parsed.type === 'account') {
            const info = parsed.info;
            const mint = new PublicKey(info.mint);
            const owner = new PublicKey(info.owner);
            const ata = getAssociatedTokenAddressSync(mint, owner, true, TPID);
            Response.data.account = Account
            if (ata.equals(publicKey)) {
                Response.type = "SPL"
                Response.data.authority = owner //TODO get balance for this
                return Response
            }
            return Response
        }
    }
    const TheirBal = await connection.getBalance(publicKey) / Bil
    Response.type = "Wallet"
    Response.data.account = Account
    Response.data.balance = TheirBal
    const OpenPositions = await GetTokens(Account, null, Connections);
    Response.data.openPositions = OpenPositions
    return Response;
}



module.exports = { AnalyseAccount }