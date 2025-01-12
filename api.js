require('dotenv').config();

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bs58 = require("bs58").default
const { generateKey, decodeKey } = require("./Operations/PassGen.js")
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const GetTokens = require("./Getters/TokenBalance/GetTokens.js")
const Bil = 1000000000
let CompletedCopies = []
const { FetchSolVal } = require('./Getters/SolVal/JupiterV2.js');
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
const SpecialTokens = {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
    So11111111111111111111111111111111111111112: "WSOL",
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
    HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr: "EURC",
}
async function GetBal(UserID, Wallet) {
    //!important
    const connection = RPCConnectionsByUser[UserID].Main
    //TODO make it so it uses main and subconnections instead of just main
    try {
        const Balance = await connection.getBalance(new PublicKey(Wallet)) / Bil
        return Balance
    } catch (e) {
        console.log("COULD NOT GET BALANCE")
        return "err"
    }
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
function print(str) {
    console.log(str)
}
const app = express();
const MaxWallets = 100;
const port = process.env.PORT
const WebIP = process.env.WebIP
const AuthTimeMins = 8;
let blacklist = {};
let TokenToKey = {}
app.set('trust proxy', 1);
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

const DataMap = {
    "PriorityFee": "float",
    "MaxProportionSpending": "float",
    "MinimumSpending": "float",
    "MaxMarketCap": "float",
    "Halted": "boolean",
    "Valid": "boolean",
    "Alias": "string",
}
function convertValue(param, value) {
    const type = DataMap[param];
    switch (type) {
        case "float":
            return parseFloat(value);
        case "boolean":
            return value === "true" || value === true;
        case "string":
            return String(value);
        default:
            throw new Error(`Unsupported type for param: ${param}`);
    }
}
function GetData(JSONFile) {
    const path = `./db/${JSONFile}.json`;
    const data = fs.readFileSync(path);
    const Info = JSON.parse(data);
    return Info
}
function WriteData(JSONFile, Dictionary) {
    const path = `./db/${JSONFile}.json`;
    fs.writeFileSync(path, JSON.stringify(Dictionary, null, 2));
}
function KeyToUser(Key) {
    const Passes = GetData("Passes")
    const User = Passes[Key]
    return User
}



function NewWallet(UserID, WalletAddress, WalletData) {
    let UserValues = GetData("UserValues")
    UserValues[UserID].Targets[WalletAddress] = WalletData
    console.log(UserValues)
    WriteData("UserValues", UserValues)
    if (WalletData.Valid) {
        AddWalletToScript(UserID, WalletAddress)
    }

    //TODO make a check for duplicate wallets, make a check to see if its client's wallet
}
const NewUserTemplate = {
    Targets: {},
    ObfBaseTransKey: null,
    Connections: {
        Main: "https://public.ligmanode.com",
        SubConnections: [
            "https://public.ligmanode.com",
        ]
    }
}



function NewUser(DiscordID) {
    const NewKey = generateKey(IDInt)
    const UserData = GetUserData()
    const Passes = GetData("Passes")
    Passes[NewKey] = DiscordID
    UserData[DiscordID] = NewUserTemplate
    WriteData("Passes", Passes)
    WriteData("UserValues", UserData)
    return NewKey
}


function SetWalletAddress(UserID, Old, New, Data) {
    let UserValues = GetData("UserValues")
    //TODO make sanity check here
    console.log("Chaning!")
    UserValues[UserID].Targets[New] = Data || UserValues[UserID].Targets[Old]
    delete UserValues[UserID].Targets[Old]
    WriteData("UserValues", UserValues)
    return UserValues[UserID]
}

function RemoveWallet(UserID, AccountToRemove) {
    let UserValues = GetData("UserValues")
    delete UserValues[UserID].Targets[AccountToRemove];
    WriteData("UserValues", UserValues)
}

function EditDataBaseValue(UserID, Target, Param, Value) {
    let UserValues = GetData("UserValues")
    if (!(Param in DataMap)) {
        throw new Error(`Unknown parameter: ${Param}`);
    }
    const convertedValue = convertValue(Param, Value);
    UserValues[UserID].Targets[Target][Param] = convertedValue;
    WriteData("UserValues", UserValues)
    return UserValues[UserID]
}
function SetDataBaseValues(UserID, Target, Values) {
    let UserValues = GetData("UserValues")
    Values.Valid = UserValues[UserID].Targets[Target].Valid
    UserValues[UserID].Targets[Target] = Values;
    WriteData("UserValues", UserValues)
    return Values
}

function GetUserData(Key) {
    const UserValues = GetData("UserValues")
    if (!Key) {
        return UserValues
    }
    const User = decodeKey(Key)
    const UserData = UserValues[User]
    console.log(User, UserValues, UserData, Key)
    return UserData
}

function invalidateToken(token) {
    const decoded = jwt.decode(token);
    blacklist[decoded.jti] = true;
    setTimeout(() => {
        delete blacklist[decoded.jti];
        delete TokenToKey[decoded.jti]
    }, (decoded.exp * 1000) - Date.now());
}

function generateSessionToken(Key, clientIp) {
    console.log(Key)
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + AuthTimeMins * 60;
    const NewToken = jwt.sign({ Key, clientIp, issuedAt, expiresAt }, process.env.JWT, { jwtid: generateJti() });
    TokenToKey[NewToken] = Key
    return NewToken
}

function generateJti() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSessionToken(token, currentIp) {
    try {
        const payload = jwt.verify(token, process.env.JWT);
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.expiresAt < currentTime) {
            throw new Error('Token expired');
        }

        if (blacklist[payload.jti]) {
            throw new Error('Token blacklisted');
        }
        if (payload.clientIp !== currentIp) {
            throw new Error(`IP address mismatch. payload: ${payload.clientIp} | Current: ${currentIp}`);
        }

        return payload.Key;
    } catch (err) {
        return null;
    }
}


app.listen(port, WebIP, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});

const Origins = [
    "chrome-extension://lkdhledpbhaplhlkpidfelelcmiinknn",
    "chrome-extension://cdglhdpadffbnjbgbglpmkokgfdjmcll",
    "chrome-extension://klehhdabnpholjlfjflaifpkgjnekjbi",
    "chrome-extension://nbmoeigmlejgliinjpkjggobbbokeaje",
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (Origins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(express.json());
app.use(cors(corsOptions));
const WebSocket = require('ws');

// Mock session token validation

const wss = new WebSocket.Server({ port: process.env.PORT });
wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const sessionToken = params.get('session_token');

    if (!validateSessionToken(sessionToken)) {
        ws.close(4001, 'Invalid session token');
        return;
    }

    console.log(`Client connected with sessionToken: ${sessionToken}`);

    // Send a welcome message
    ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));

    ws.on('message', (message) => {
        console.log(`Message from client:`, message);
    });

    ws.on('close', () => {
        console.log(`Client with sessionToken ${sessionToken} disconnected`);
    });
});

function ValidateKey(key) {
    const ValidKeys = GetData("Passes")
    const KeyOwner = ValidKeys[key];
    return KeyOwner;
}

function KeyCheck(res, key, token, Authentication, clientIp) {
    if (blacklist[token]) {
        res.status(401).send({ error: "Token is blacklisted" });
        return false;
    }

    if ((!token || !validateSessionToken(token, clientIp)) && (!key || !ValidateKey(key))) {
        res.status(401).send({ error: "API key needed" });
        return false;
    }

    return true;
}

app.get("/authenticate", async (req, res) => {
    const key = req.query.key;
    const clientIp = req.ip;
    if (!KeyCheck(res, key, req.query.session_token, true, clientIp)) return;
    const token = generateSessionToken(key, clientIp);
    console.log("Generating new token:", token);
    const Seconds = AuthTimeMins * 60;
    const Miliseconds = Seconds * 1000;
    res.cookie('session_token', token, { httpOnly: true, secure: true, maxAge: Miliseconds });
    return res.status(200).send({ success: true, message: 'Authentication successful!', token: token });
});

app.get("/getData", async (req, res) => {
    const clientIp = req.ip;
    const key = req.query.key;
    const SessionToken = req.query.session_token
    if (!KeyCheck(res, key, SessionToken, true, clientIp)) return;
    if (key) {
        const Data = GetUserData(key)
        res.status(200).send(Data);
    } else if (SessionToken) {
        const key = TokenToKey[SessionToken]
        const Data = GetUserData(key)
        console.log("giving data: ", Data)
        res.status(200).send(Data);
    }
    return
})
app.get("/validate", async (req, res) => {
    const token = req.query.session_token;
    const clientIp = req.ip;
    const IsValid = validateSessionToken(token, clientIp);

    if (IsValid) {
        const payload = jwt.decode(token);
        const newToken = generateSessionToken(TokenToKey[token], clientIp);
        invalidateToken(token); // Invalidate the old token
        res.status(200).send({ success: true, message: 'TokenValid', token: newToken });
        console.log("reinstating key")
    } else {
        console.log("invalid token: ", token)
        res.status(403).send({ success: false, message: 'Token invalid', token: token });
    }
});



app.get("/getMe", async (req, res) => {
    const clientIp = req.ip;
    console.log(`Client IP: ${clientIp}`);
    res.status(200).send({ clientIp });
});


app.get("/api/tools/generateWallet", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    const keypair = Keypair.generate();
    const PubKey = keypair.publicKey.toBase58()
    const PrivKey = Buffer.from(keypair.secretKey).toString("hex")
    let Response = {}
    Response.publicKey = PubKey
    Response.privateKey = PrivKey
    res.status(200).send(Response);
});
app.get("/api/tools/scanner", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    let key = null
    if (req.query.key) {
        key = req.query.key
    } else if (req.query.session_token) {
        key = validateSessionToken(req.query.session_token, clientIp)
    }
    const UserID = KeyToUser(key)
    const AccountToScan = req.query.account

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    console.log("user: ", UserID)
    console.log("db: ", RPCConnectionsByUser)

    const Response = await AnalyseAccount(AccountToScan, RPCConnectionsByUser[UserID].SubConnections)
    if (typeof (Response) == "string") {
        return res.status(200).send({ Response });

    }
    res.status(200).send(Response);
});
app.get("/api/tools/generateWallets", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    const NumWallets = req.query.amount
    if (!NumWallets) {
        return res.status(400).send({ error: "Amount parameter is required" });
    }
    if (NumWallets > MaxWallets) {
        return res.status(400).send({ error: `Amount of wallets must be under ${MaxWallets}` });
    }

    if (NumWallets < 1) {
        return res.status(400).send({ error: `Amount of wallets must be over or equal to 1` });
    }

    let Response = {}
    Response.wallets = []
    for (let x = 1; x < NumWallets; x++) {
        const keypair = Keypair.generate();
        const PubKey = keypair.publicKey.toBase58()
        const PrivKey = Buffer.from(keypair.secretKey).toString("hex")
        Response.wallets.push({
            publicKey: PubKey,
            privateKey: PrivKey
        })
    }
    res.status(200).send(Response);
});


//TODO add sanity checks for all params
//TODO add ratelimits for all methods

app.post("/setValue", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    console.log(UserID)
    const AccountToEdit = req.query.account
    const Param = req.query.param
    const Value = req.query.value
    const DataDictionary = EditDataBaseValue(UserID, AccountToEdit, Param, Value)
    res.status(200).send({ success: true, data: DataDictionary });
});


app.post("/setValues", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const Params = req.body
    const AccountToEdit = req.query.account
    const DataSet = SetDataBaseValues(UserID, AccountToEdit, Params)
    res.status(200).send({ success: true, data: DataSet });
});

app.post("/setWalletAddress", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const Params = req.body
    const WalletAnalysis = await AnalyseAccount(req.query.new, RPCConnectionsByUser[UserID].SubConnections)

    let NewAddressIsValid = true
    if (!WalletAnalysis || WalletAnalysis.type != "Wallet") {
        NewAddressIsValid = false
        Params.Halted = true
    }
    Params.Valid = NewAddressIsValid

    const data = SetWalletAddress(UserID, req.query.old, req.query.new, Params)
    res.status(200).send({ success: true, IsValid: NewAddressIsValid });
});


app.post("/newWallet", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const Params = req.body
    Params.Valid = false
    NewWallet(UserID, req.query.account, Params)

    console.log("Params: ", Params)
    res.status(200).send({ success: true, data: Params });
});

app.post("/removeWallet", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const AccountToRemove = req.query.account
    console.log("removing: ", AccountToRemove)
    RemoveWallet(UserID, AccountToRemove)
    res.status(200).send({ success: true, data: AccountToRemove });
});
app.post("/newUser", async (req, res) => {
    const clientIp = req.ip;
    const MasterKey = req.query.MSK
    const id = req.query.id
    if (MasterKey != process.env.MasterKey) {
        console.log(MasterKey, process.env.MasterKey)
        res.status(403).send({ success: false, message: 'invalid key' });
        return
    }
    const NewAcc = NewUser(id)
    res.status(200).send({ success: true, key: NewAcc });
});
function inferTransactionType(amount) {
    if (amount > 0) {
        return 'buy'
    } else if (amount < 0) {
        return 'sell'
    } else {
        return 'no change'
    }
}
function enqueueSwap(Data) {
    if (CompletedCopies.includes(Data.Signature)) { //TODO make it shift and clear old signatures
        console.log("duplicate transaction detected. skipping")
        return
    }
    console.log(`WOULD ENQUEUE SWAP AT ${Date.now()}`, Data)
}
async function checkTokenBalances(signature, TransType, WalletAddress, logs, deep, UserID) {
    const CurrentTargetWalletData = EachUserTargetData[UserID][WalletAddress]
    const UserTokens = EachUserTokens[UserID]

    let Diagnosed = false
    if (deep >= 20) {
        console.log("max retries for changes logged exceeded")
        return
    }
    try {
        let TheirLastTokens = CurrentTargetWalletData.PreviousTokens
        if (TheirLastTokens instanceof Promise) {
            TheirLastTokens = await TheirLastTokens;
        }
        const TheirCurrentTokens = await GetTokens(WalletAddress, TheirLastTokens, RPCConnectionsByUser[UserID].SubConnections);
        
        if (AreDictionariesEqual(TheirLastTokens, TheirCurrentTokens) && deep == 0) {
            console.log("no change in wallet detected. Retrying", deep + 1)
            await checkTokenBalances(signature, TransType, WalletAddress, logs, deep + 1, UserID)
            return
        } else {
            if (deep != 0) {
                console.log("deepness: ", deep)
            }
        }
        const WalletFactor = CurrentTargetWalletData.WalletFactor
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
                            Wallet: WalletAddress,
                            Signature: signature,
                            logs: logs,
                            AmountTheyreBuying: CurrentMintAmount,
                        }
                        await enqueueSwap(SwapData);
                        Diagnosed = true
                    } else if (transactionType == "sell") {
                        // token amount IN MINT
                        const FactorSold = Math.abs(balanceChange) / LastMintAmount
                        const MyTokenAmountSelling = UserTokens[mint] * FactorSold || 0
                        console.log(balanceChange, LastMintAmount, UserTokens, FactorSold, MyTokenAmountSelling, null, logs)
                        console.log(GetTime(), "SELLING", MyTokenAmountSelling, mint)

                        const SwapData = {
                            transactionType: "sell",
                            mintAddress: mint,
                            AmountOfTokensToSwap: MyTokenAmountSelling,
                            Wallet: WalletAddress,
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
                console.log(HowManyTokensToBuy, SolVal, CurrentMintAmount, WalletFactor, mint, signature)
                console.log(GetTime(), "BUYING INITIAL", HowManyTokensToBuy)

                const SwapData = {
                    transactionType: "buy",
                    mintAddress: mint,
                    AmountOfTokensToSwap: HowManyTokensToBuy,
                    Wallet: WalletAddress,
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
                const AllMyMint = UserTokens[mint] || 0;
                console.log(GetTime(), "SELLING ALL", AllMyMint);
                const SwapData = {
                    transactionType: "sell",
                    mintAddress: mint,
                    AmountOfTokensToSwap: AllMyMint,
                    Wallet: WalletAddress,
                    Signature: signature,
                    logs: logs,
                    FactorSold: 1,
                }
                await enqueueSwap(SwapData);
                Diagnosed = true;
            }
        }
        CurrentTargetWalletData.PreviousTokens = TheirCurrentTokens
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.warn('Encountered 429 Too Many Requests. slow down.');
        } else {
            console.error('Unexpected error during token balance check:', error);
        }
    }
    if (!Diagnosed) {
        console.log("?no change? retrying", TransType, logs, GetTime(), deep + 1, UserID)
        await checkTokenBalances(signature, TransType, WalletAddress, logs, deep + 1, UserID)
        return
    }
}


function handleTradeEvent(signature, TransType, Address, logs, UserID) {
    if (!CompletedCopies.includes(signature)) {
        checkTokenBalances(signature, TransType, Address, logs, 0, UserID)
    } else {
        console.log("FOR SOME REASON GEEKED")
    }
}

let EachUserTargetData = {}
let LoggedSignatures = []
let subscriptions = {}
const MAX_SIGNATURES = 1000
function subscribeToWalletTransactions(UserID, WalletAdd) {
    const CurrWalletPubKey = new PublicKey(WalletAdd);
    const UserData = GetData("UserValues")
    const CurrentClientBal = GetBal(UserID, PrivToPub(UserData[UserID].ObfBaseTransKey))
    
    for (const index in RPCConnectionsByUser[UserID].SubConnections) {
        const connection = RPCConnectionsByUser[UserID].SubConnections[index]
        const id = connection.onLogs(CurrWalletPubKey, async (logs, ctx) => {
            if (!SolVal) {
                //! no solvalue; wil break
                //TODO make it log this
                return
            }
            if (LoggedSignatures.includes(logs.signature)) {
                return;
            }
            if (LoggedSignatures.length > MAX_SIGNATURES) {
                EachUserTargetData[UserID][WalletAdd].PreviousTokens = GetTokens(WalletAdd, null, RPCConnectionsByUser[UserID].SubConnections)

                UpdateWalletFactor(UserID, WalletAdd, CurrentClientBal)
                LoggedSignatures.shift()
            }
            if (findMatchingStrings(logs.logs, ["Program log: Instruction: TransferChecked"])) {
                return
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
                LoggedSignatures.push(logs.signature)
                handleTradeEvent(logs.signature, InString, WalletAdd, logs.logs, UserID);
            } else {
                console.log("Useless data: ", logs.signature);
            }
        }, 'confirmed');
        if (!subscriptions[UserID][WalletAdd]) {
            subscriptions[UserID][WalletAdd] = {};
        }
        subscriptions[UserID][WalletAdd][index] = id;
    }
    UpdateWalletFactor(UserID, WalletAdd, CurrentClientBal);
}
process.on('SIGINT', async () => {
    console.info('Received SIGINT. Shutting down at ', GetTime());
    for (const User in subscriptions) {
        for (const wallet in subscriptions[User]) {
            for (const index in subscriptions[wallet]) {
                await connections[index].removeOnLogsListener(subscriptions[UserID][wallet][index]);
            }
        }
    }

    process.exit(0);
});


async function UpdateWalletFactor(UserID, Wallet, PresetWalletSize = null) {
    const UserData = GetData("UserValues")
    const WalletSize = await GetBal(UserID, Wallet);

    console.log("WS Details: ", UserID, PrivToPub(UserData[UserID].ObfBaseTransKey))

    const UserWalletSize = PresetWalletSize || await GetBal(UserID, PrivToPub(UserData[UserID].ObfBaseTransKey))
    console.log("user wallet size: ", UserWalletSize)
    EachUserTargetData[UserID][Wallet].WalletFactor = Math.min(UserWalletSize / WalletSize, 1);
    EachUserTargetData[UserID][Wallet].WalletSize = WalletSize
}
//TODO make remove wallet from script (for when deleting and changing names)
async function AddWalletToScript(UserID, Wallet) {
    const CurrentTokens = GetTokens(Wallet, null, RPCConnectionsByUser[UserID].SubConnections)
    EachUserTargetData[UserID][Wallet] = { PreviousTokens: CurrentTokens}
    UpdateWalletFactor(UserID, Wallet)
    subscribeToWalletTransactions(UserID, Wallet)
}
let EachUserTokens = {}
let RPCConnectionsByUser = {}
async function AddRPCToScript(UserID, Link) {
    const ArrEnd = RPCConnectionsByUser[UserID].SubConnections.length
    RPCConnectionsByUser[UserID].SubConnections[ArrEnd] = new Connection(Link, { commitment: 'confirmed' });
}
//9WD3qzitzuC1r
//879244945867804700
async function main() {
    const UserData = GetData("UserValues")
    const UserPasses = GetData("Passes")
    for (const Pass in UserPasses) {
        const UserID = String(UserPasses[Pass])
        EachUserTargetData[UserID] = {}
        console.log("uid: ", UserID)
        console.log("ud: ", UserData)
        console.log("pass: ", Pass)
        const CurrentUserTargets = UserData[UserID].Targets

        subscriptions[UserID] = {}
        RPCConnectionsByUser[UserID] = {
            Main: null,
            SubConnections: []
        }
        UserData[UserID].Connections.SubConnections.forEach((endpoint, index) => {
            console.log("adding rpc")
            AddRPCToScript(UserID, endpoint)
        });

        RPCConnectionsByUser[UserID].Main = new Connection(UserData[UserID].Connections.Main)
       
        const MyWallet = PrivToPub(UserData[UserID].ObfBaseTransKey)
        
        for (const TargetWallet in CurrentUserTargets) {
            if (UserData[UserID].Targets[TargetWallet].Valid == true) {
                AddWalletToScript(UserID, TargetWallet)
            }
        }
        const PersonalWalletPubKey = new PublicKey(MyWallet)
        RPCConnectionsByUser[UserID].Main.onLogs(PersonalWalletPubKey, async (logs, ctx) => {
            Events.emit(`${UserID}:${logs.signature}`, logs)
        }, 'confirmed')
        
        EachUserTokens[UserID] = GetTokens(MyWallet, null, RPCConnectionsByUser[UserID].SubConnections)
    }
}
main()
