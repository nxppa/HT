require('dotenv').config();
const express = require('express');
const EventEmitter = require("events")
const Events = new EventEmitter();
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const bs58 = require("bs58").default
const { generateKey, decodeKey } = require("./Operations/PassGen.js")
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const GetTokens = require("./Getters/TokenBalance/GetTokens.js")
const Bil = 1000000000
let CompletedCopies = {}
let SignatureAnalysis = {}
const { FetchSolVal } = require('./Getters/SolVal/JupiterV2.js');
let SolVal = FetchSolVal()
let MaxRecentTransactionsPerWallet = 25 //TODO make this editable via console
const { getAsset } = require("./Getters/AssetInfo/Helius.js")
const { Swap } = require('./Operations/PumpPortal.js');


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
    const connectionList = RPCConnectionsByUser[UserID].SubConnections;
    try {
        const tokenBalances = await GetTokens(Wallet, null, connectionList);
        const solBalance = await RPCConnectionsByUser[UserID].Main.getBalance(new PublicKey(Wallet)) / Bil;
        const wsolBalance = tokenBalances["So11111111111111111111111111111111111111112"] || 0;
        return solBalance + wsolBalance;
    } catch (e) {
        console.log("COULD NOT GET BALANCE");
        return "err";
    }
}

function PrivToPub(PrivateKey) {
    try {
        const privateKeyArray = bs58.decode(PrivateKey);
        const keypair = Keypair.fromSecretKey(privateKeyArray);
        return keypair.publicKey.toBase58();
    } catch (error) {
        throw new Error('Invalid private key format or input. Ensure it is a valid Base58-encoded string.');
    }
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
        Main: null,
        SubConnections: [
            null,
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

const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
    credentials: true // Allow cookies or authentication headers
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(compression());

function SendWS(UserID, Dictionary) {
    const UserWebSocket = UserIDToWebsocket[UserID]
    if (UserWebSocket) {
        return UserWebSocket.send(JSON.stringify(Dictionary))
    } else {
        return false
    }
}
let UserIDToWebsocket = {}
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: Number(process.env.WSPORT) })
wss.on('connection', (ws, req) => {
    console.log("rcvd")
    const params = new URLSearchParams(req.url.split('?')[1]);
    const sessionToken = params.get('session_token');
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const Key = validateSessionToken(sessionToken, clientIp)
    if (!Key) {
        return
    }
    const UserID = KeyToUser(Key)
    UserIDToWebsocket[UserID] = ws
    SendWS(UserID, { message: 'established ws connection' });
    ws.on('message', (message) => {

        console.log(`Message from client:`, message)

    });
    ws.on('close', () => {
        delete UserIDToWebsocket[UserID]
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
    return res.status(200).send({ success: true, message: 'Authentication successful!', token: token, UserData: GetUserData(key) });
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
        const Key = TokenToKey[token]
        const newToken = generateSessionToken(Key, clientIp);
        invalidateToken(token); // Invalidate the old token
        res.status(200).send({ success: true, message: 'TokenValid', token: newToken, UserData: GetUserData(Key) });
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
    const WalletAnalysis = await AnalyseAccount(req.query.account, RPCConnectionsByUser[UserID].SubConnections)
    let NewAddressIsValid = true
    if (!WalletAnalysis || WalletAnalysis.type != "Wallet") {
        NewAddressIsValid = false
        Params.Halted = true
    }
    Params.Valid = NewAddressIsValid

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

async function HandleSwap(UserID, Key, Mint, Amount, Slippage, PriorityFee, TransactionType, Connection) {
    //TODO make it not retry in certain cases such as insufficient funds
    let MaxNumRetrying = 3
    if (TransactionType == "buy") {
        EachUserTokens[UserID][Mint] = EachUserTokens[UserID][Mint] ? EachUserTokens[UserID][Mint] : 0
        EachUserTokens[UserID][Mint] += Amount //! imaginary tokens
        MaxNumRetrying = 1
    } else if (TransactionType == "sell") {
        EachUserTokens[UserID][Mint] -= Amount
    }
    let Successful = false
    let Signature = null
    let Tries = 0
    for (let i = 0; i < MaxNumRetrying; i++) {
        Tries = i + 1 //! indexes at 1
        const ParsedSignature = await Swap(Key, Mint, Amount, Slippage, PriorityFee, TransactionType, Connection)
        if (!ParsedSignature) {
            console.log("no signature parsed; continuing")
            continue // ! no signature; continue
        }
        
        Signature = ParsedSignature
        await new Promise((resolve) => {
            Events.once(`${UserID}:${Signature}`, (Param) => {
                if (Param === Signature) resolve();
            });
        });
        const Analysis = SignatureAnalysis[Signature]
        if (findMatchingStrings(Analysis, ["Error", "panicked"], true) || Analysis.err) {
            continue
        }
        Successful = true
    }
    if (!Successful){
        EachUserTokens[UserID][Mint] = EachUserTokens[UserID][Mint] ? EachUserTokens[UserID][Mint] : 0
        if (TransactionType == "buy"){
            EachUserTokens[UserID][Mint] -= Amount
        } else if (TransactionType == "sell"){
            EachUserTokens[UserID][Mint] += Amount
        }
    }
    return {Successful, Signature, Tries}
}

async function enqueueSwap(Data) {
    let UserData = GetData("UserValues");
    let AllowedToSwap = true
    const User = Data.User;
    const TargetWalletData = UserData[User].Targets[Data.CopyingWallet];
    if (CompletedCopies[User].length > 100) {
        CompletedCopies[User].shift();
    }
    if (CompletedCopies[User].includes(Data.Signature)) {
        console.log("Duplicate transaction detected. Skipping.");
        return;
    }
    if (!Data.AmountOfTokensToSwap) {
        console.log("Invalid amount of tokens to swap; skipping: ", Data.AmountOfTokensToSwap);
        AllowedToSwap = false
        //return; //TODO make it parse transactions even if amount is invalid to include target wallet transactions in logs
    }
    if (Data.AmountTheyreBuying < 1000) {
        console.log("PARSED TINY TRANSACTION: ", Data.Signature);
    }
    console.log("DETECTED AT ", GetTime());
    const Key = UserData[User].ObfBaseTransKey;
    const PrioFee = TargetWalletData.PriorityFee;
    let ParsedData = null;
    if (!TargetWalletData.Halted && AllowedToSwap) {
        ParsedData = await HandleSwap(User, Key, Data.mintAddress, Data.AmountOfTokensToSwap, 40, PrioFee, Data.transactionType, RPCConnectionsByUser[User].Main);
        //TODO add/remove tokens based on transaction, add imaginary tokens when buying to fulfil transactions so its not gay
        console.log("SWAP STATUS: ", ParsedData);
    } else if (AllowedToSwap) {
        ParsedData = { Successful: false }
    } else {
        ParsedData = { Successful: true }
    }
    const AssetData = await getAsset(Data.mintAddress);
    Data.Token = AssetData;
    let MessageToClient = {
        type: "Transaction",
        data: Data,
    };

    MessageToClient.data.Time = Date.now()
    MessageToClient.data.Halted = !!UserData[User].Targets[Data.CopyingWallet].Halted;
    MessageToClient.data.SuccessfullyEnacted = ParsedData.Successful;
    delete MessageToClient.User;
    delete MessageToClient.data.logs;
    UserData[User].Targets[Data.CopyingWallet].RecentTransactions.push(Data);
    if (UserData[User].Targets[Data.CopyingWallet].RecentTransactions.length > MaxRecentTransactionsPerWallet) {
        UserData[User].Targets[Data.CopyingWallet].RecentTransactions.shift();
    }
    WriteData("UserValues", UserData);
    SendWS(User, MessageToClient);
}

async function checkTokenBalances(signature, TransType, WalletAddress, logs, deep, UserID) {
    const CurrentTargetWalletData = EachUserTargetData[UserID][WalletAddress]
    let Diagnosed = false
    if (deep >= 10) {
        //TODO make it so its a time limit aswell as max retries limit
        console.log("max retries for changes logged exceeded")
        return
    }
    try {
        let TheirLastTokens = CurrentTargetWalletData.PreviousTokens
        if (TheirLastTokens instanceof Promise) {
            TheirLastTokens = await TheirLastTokens;
        }
        const TargetCurrentTokens = await GetTokens(WalletAddress, TheirLastTokens, RPCConnectionsByUser[UserID].SubConnections);
        const UserCurrentTokens = EachUserTokens[UserID]
        if (AreDictionariesEqual(TheirLastTokens, TargetCurrentTokens) && deep == 0) {
            console.log("no change in wallet detected. Retrying", deep + 1)
            await checkTokenBalances(signature, TransType, WalletAddress, deep + 1, UserID)
            return
        } else {
            if (deep != 0) {
                //console.log("deepness: ", deep)
            }
        }
        const WalletFactor = CurrentTargetWalletData.WalletFactor
        if (Number.isNaN(WalletFactor)) {
            console.warn("WALLET FACTOR IS NAN. accompanying data: ", UserID, CurrentTargetWalletData)
        }
        for (const mint in TargetCurrentTokens) {
            const CurrentMintAmount = TargetCurrentTokens[mint]
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
                        console.log(GetTime(), "BUYING", signature)
                        const SwapData = {
                            transactionType: "buy",
                            mintAddress: mint,
                            AmountOfTokensToSwap: HowManyTokensToBuy,
                            CopyingWallet: WalletAddress,
                            Signature: signature,
                            logs: logs,
                            AmountTheyreBuying: balanceChange,
                            User: UserID,
                        }   
                        await enqueueSwap(SwapData);
                        Diagnosed = true
                    } else if (transactionType == "sell") {
                        // token amount IN MINT
                        const FactorSold = Math.abs(balanceChange) / LastMintAmount
                        const MyTokenAmountSelling = UserCurrentTokens[mint] * FactorSold || 0
                        console.log(GetTime(), "SELLING", signature)

                        const SwapData = {
                            transactionType: "sell",
                            mintAddress: mint,
                            AmountOfTokensToSwap: MyTokenAmountSelling,
                            CopyingWallet: WalletAddress,
                            Signature: signature,
                            logs: logs,
                            FactorSold: FactorSold,
                            User: UserID,

                        }

                        await enqueueSwap(SwapData);
                        Diagnosed = true
                    }
                }
            } else {
                //Token amount IN MINT
                const HowManyTokensToBuy = CurrentMintAmount * WalletFactor
                console.log(GetTime(), "BUYING INITIAL", signature)
                const SwapData = {
                    transactionType: "buy",
                    mintAddress: mint,
                    AmountOfTokensToSwap: HowManyTokensToBuy,
                    CopyingWallet: WalletAddress,
                    Signature: signature,
                    logs: logs,
                    AmountTheyreBuying: CurrentMintAmount,
                    User: UserID,

                }
                await enqueueSwap(SwapData);
                Diagnosed = true

            }
        }
        for (const mint in TheirLastTokens) {
            if (TargetCurrentTokens[mint] == null) {
                const AllMyMint = UserCurrentTokens[mint] || 0; //! fix this
                console.log(GetTime(), "SELLING ALL", signature);
                const SwapData = {
                    transactionType: "sell",
                    mintAddress: mint,
                    AmountOfTokensToSwap: AllMyMint,
                    CopyingWallet: WalletAddress,
                    Signature: signature,
                    logs: logs,
                    FactorSold: 1,
                    User: UserID,
                }
                await enqueueSwap(SwapData);
                Diagnosed = true;
            }
        }
        CurrentTargetWalletData.PreviousTokens = TargetCurrentTokens
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.warn('Encountered 429 Too Many Requests. slow down.');
        } else {
            console.log('Error Swapping:', error.transactionMessage);
        }
    }
    if (!Diagnosed) {
        console.log("?no change? retrying", TransType, GetTime(), deep + 1, UserID)
        await checkTokenBalances(signature, TransType, WalletAddress, logs, deep + 1, UserID)
        return
    }
}



function handleTradeEvent(signature, TransType, Address, logs, UserID) {
    if (!CompletedCopies[UserID].includes(signature)) {
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
            UpdateWalletFactor(UserID, WalletAdd, CurrentClientBal, logs.signature)
                .then(SOLBalChange => {
                    if (SOLBalChange) {
                        console.log("SOLBalChange: ", SOLBalChange, logs.signature, WalletAdd);
                    }
                })


            if (LoggedSignatures.length > MAX_SIGNATURES) {
                EachUserTargetData[UserID][WalletAdd].PreviousTokens = GetTokens(WalletAdd, null, RPCConnectionsByUser[UserID].SubConnections)
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
                //!console.log("Useless data: ", logs.signature);
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


async function UpdateWalletFactor(UserID, Wallet, PresetWalletSize = null, Signature = null, retries = 3) {
    const UserData = GetData("UserValues");
    const getUserWalletSizePromise = PresetWalletSize !== null
        ? Promise.resolve(PresetWalletSize)
        : GetBal(UserID, PrivToPub(UserData[UserID].ObfBaseTransKey));
    const getWalletSizePromise = GetBal(UserID, Wallet);
    const [WalletSize, UserWalletSize] = await Promise.all([getWalletSizePromise, getUserWalletSizePromise]);

    EachUserTargetData[UserID][Wallet].WalletFactor = Math.min(UserWalletSize / WalletSize, 1);
    const BalanceBefore = EachUserTargetData[UserID][Wallet].WalletSize;
    EachUserTargetData[UserID][Wallet].WalletSize = WalletSize;
    const SOLBalChange = WalletSize - BalanceBefore;
    if (SOLBalChange === 0 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust delay as needed
        return UpdateWalletFactor(UserID, Wallet, PresetWalletSize, Signature, retries - 1);
    }

    return SOLBalChange;
}

async function RemoveWallet(UserID, AccountToRemove) {
    let UserValues = GetData("UserValues")
    //TODO make this not just remove from json file but also remove from script

    delete UserValues[UserID].Targets[AccountToRemove];
    WriteData("UserValues", UserValues)
}
async function AddWalletToScript(UserID, Wallet) {
    const CurrentTokens = GetTokens(Wallet, null, RPCConnectionsByUser[UserID].SubConnections)
    EachUserTargetData[UserID][Wallet] = { PreviousTokens: CurrentTokens }
    UpdateWalletFactor(UserID, Wallet)
    subscribeToWalletTransactions(UserID, Wallet)
}
let EachUserTokens = {}
let RPCConnectionsByUser = {}
async function AddRPCToScript(UserID, Link) {
    const ArrEnd = RPCConnectionsByUser[UserID].SubConnections.length
    RPCConnectionsByUser[UserID].SubConnections[ArrEnd] = new Connection(Link, "confirmed" );
}
//9WD3qzitzuC1r
//879244945867804700
async function AddUserToScript(UserID) {
    const UserData = GetData("UserValues")
    EachUserTargetData[UserID] = {}
    CompletedCopies[UserID] = []
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
    RPCConnectionsByUser[UserID].Main = new Connection(UserData[UserID].Connections.Main, "confirmed")
    const MyWallet = PrivToPub(UserData[UserID].ObfBaseTransKey)
    for (const TargetWallet in CurrentUserTargets) {
        if (UserData[UserID].Targets[TargetWallet].Valid == true) {
            AddWalletToScript(UserID, TargetWallet)
        }
    }
    const PersonalWalletPubKey = new PublicKey(MyWallet)
    RPCConnectionsByUser[UserID].Main.onLogs(PersonalWalletPubKey, async (logs, ctx) => {
        SignatureAnalysis[logs.signature] = logs.logs //TODO make this shift and clear
        Events.emit(`${UserID}:${logs.signature}`, logs.signature)
    }, 'confirmed')
    EachUserTokens[UserID] = GetTokens(MyWallet, null, RPCConnectionsByUser[UserID].SubConnections)
}
async function main() {
    const UserPasses = GetData("Passes")
    for (const Pass in UserPasses) {
        const UserID = String(UserPasses[Pass])
        AddUserToScript(UserID)
    }
}
main()
