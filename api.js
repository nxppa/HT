const express = require('express');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { generateKey, decodeKey } = require("./Operations/PassGen.js")
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const app = express();
const MaxWallets = 100;
const port = 3000; // TODO: Make env files
const BackupIp = "142.93.123.245";
const SECRET_KEY = 'oeruahgbaoieurgboiWGEOYUFGPiweh9f'; // TODO: Use an environment variable
const AuthTimeMins = 8;
let blacklist = {};
let TokenToKey = {}
app.set('trust proxy', 1);



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
function GetData(JSONFile){
    const path = `./db/${JSONFile}.json`;
    const data = fs.readFileSync(path);
    const Info = JSON.parse(data);
    return Info
}
function WriteData(JSONFile, Dictionary){
    const path = `./db/${JSONFile}.json`;
    fs.writeFileSync(path, JSON.stringify(Dictionary, null, 2));
}
function KeyToUser(Key){
    const Passes = GetData("Passes")
    const User = Passes[Key]
    return User
}



function NewWallet(UserID, WalletAddress, WalletData){
    let UserValues = GetData("UserValues")
    UserValues[UserID].Targets[WalletAddress] = WalletData
    console.log(UserValues)
    WriteData("UserValues", UserValues)

    //TODO make a check for duplicate wallets
}
const NewUserTemplate = {
    Targets:{},
    ObfBaseTransKey:null,
}

function NewUser(DiscordID){
    //Create new pass, new uservalues
    const NewKey = generateKey(DiscordID)
    const UserData = GetUserData()
    const Passes = GetData("Passes")
    Passes[NewKey] = DiscordID
    UserData[DiscordID] = NewUserTemplate
    WriteData("Passes", Passes)
    WriteData("UserValues", UserData)
    return NewKey
}


function SetWalletAddress(UserID, Old, New, Data){
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
function SetDataBaseValues(UserID, Target, Values){
    let UserValues = GetData("UserValues")
    UserValues[UserID].Targets[Target] = Values;
    WriteData("UserValues", UserValues)
    return Values
}

function GetUserData(Key) {
    const UserValues = GetData("UserValues")
    if (!Key){
        return UserValues
    }
    const User = decodeKey(Key)
    const UserData = UserValues[User]
    console.log(User, UserValues, UserData, Key)
    return UserData
}

// Function to invalidate token
function invalidateToken(token) {
    const decoded = jwt.decode(token);
    blacklist[decoded.jti] = true;
    setTimeout(() => {
        delete blacklist[decoded.jti];
        delete TokenToKey[decoded.jti]
    }, (decoded.exp * 1000) - Date.now());
}

// Function to generate session token with IP
function generateSessionToken(Key, clientIp) {
    console.log(Key)
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + AuthTimeMins * 60;
    const NewToken = jwt.sign({ Key, clientIp, issuedAt, expiresAt }, SECRET_KEY, { jwtid: generateJti() });
    TokenToKey[NewToken] = Key
    return NewToken
}

// Function to generate a unique JWT ID
function generateJti() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Function to validate session token and IP
function validateSessionToken(token, currentIp) {
    try {
        const payload = jwt.verify(token, SECRET_KEY);
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
        console.log(err)
        return null;
    }
}

const SOLANA_RPC_ENDPOINT = "https://public.ligmanode.com"; // TODO: Maybe make it use multiple endpoints 
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
});

app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});

const Origins = [
    "chrome-extension://lkdhledpbhaplhlkpidfelelcmiinknn",
    "chrome-extension://cdglhdpadffbnjbgbglpmkokgfdjmcll",
    "chrome-extension://klehhdabnpholjlfjflaifpkgjnekjbi",
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


app.get("/api/tools/getBalance", async (req, res) => {
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return;
    const Account = req.query.account
    if (!Account) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Pub = new PublicKey(Account)
    const Balance = await connection.getBalance(Pub) / Bil
    let Response = {}
    Response.Balance = Balance
    res.status(200).send(Response);
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
app.get("/api/tools/scanner", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; //TODO add support for private wallet scanning

    const AccountToScan = req.query.account

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Response = await AnalyseAccount(AccountToScan)
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




app.post("/setValue", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; //TODO add support for private wallet scanning
    //TODO add sanity checks for params
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
    res.status(200).send({ success: true, data: DataDictionary});
});


app.post("/setValues", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; //TODO add support for private wallet scanning
    //TODO add sanity checks for params
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
    res.status(200).send({ success: true, data: DataSet});
});

app.post("/setWalletAddress", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; 
    //TODO add sanity checks for params
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const Params = req.body
    const data = SetWalletAddress(UserID, req.query.old, req.query.new, Params)

    const WalletAnalysis = await AnalyseAccount(req.query.new)
    console.log("analysis: ", WalletAnalysis)
    let NewAddressIsValid = true
    if (!WalletAnalysis || WalletAnalysis.type != "Wallet"){
        NewAddressIsValid = false
    }
    res.status(200).send({ success: true, IsValid: NewAddressIsValid});
});


app.post("/newWallet", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; //TODO add support for private wallet scanning
    //TODO add sanity checks for params
    let UserID = null
    if (req.query.key) {
        UserID = decodeKey(req.query.key)
    } else if (req.query.session_token) {
        const UserKey = TokenToKey[req.query.session_token]
        UserID = decodeKey(UserKey)
    }
    const Params = req.body
    NewWallet(UserID, req.query.account, Params)
    console.log("Params: ", Params)
    //TODO add new wallet
    res.status(200).send({ success: true, data: Params});
});

app.post("/removeWallet", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    if (!KeyCheck(res, req.query.key, req.query.session_token, false, clientIp)) return; //TODO add support for private wallet scanning
    //TODO add sanity checks for params
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
    //TODO add new wallet
    res.status(200).send({ success: true, data: AccountToRemove});
});
app.post("/newUser", async (req, res) => { //TODO add ratelimits for all methods
    const clientIp = req.ip;
    const MasterKey = req.query.MSK
    const id = req.query.id
    if (MasterKey != process.env.MasterKey){
        return
    }
    const NewUser = NewUser(id)

    //TODO add new wallet
    res.status(200).send({ success: true, key: NewUser});
});



// As soon as the script runs, parse through everyones userdata, make connections to listen to logs
let targetWallets = {}
let subscriptions = {}
function subscribeToWalletTransactions(UserID, WalletAdd) {
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
          //TODO make it log this
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
          targetWallets[WalletAdd][2] = await GetTokens(WalletAdd);
          LoggedSignature.shift()
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

async function main() {
    const UserData = GetData("UserValues")
    const UserPasses = GetData("Passes")
    for (const Pass in UserPasses){

    }

}
main()
