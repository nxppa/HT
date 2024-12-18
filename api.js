const express = require('express');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const app = express();
const MaxWallets = 100;
const port = 3000; // TODO: Make env files
const BackupIp = "142.93.123.245";
const SECRET_KEY = 'oeruahgbaoieurgboiWGEOYUFGPiweh9f'; // TODO: Use an environment variable
const AuthTimeMins = 8;
let blacklist = {};

// Configure Express to trust proxies (if behind a proxy)
app.set('trust proxy', true);

// Function to invalidate token
function invalidateToken(token) {
    const decoded = jwt.decode(token);
    blacklist[decoded.jti] = true;
    setTimeout(() => {
        delete blacklist[decoded.jti];
    }, (decoded.exp * 1000) - Date.now());
}

// Function to generate session token with IP
function generateSessionToken(userId, clientIp) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + AuthTimeMins * 60;
    return jwt.sign({ userId, clientIp, issuedAt, expiresAt }, SECRET_KEY, { jwtid: generateJti() });
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
            throw new Error('IP address mismatch');
        }

        return payload.userId;
    } catch (err) {
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

app.use(cors(corsOptions));

function ValidateKey(key){
    const ValidKeys = JSON.parse(fs.readFileSync("./db/Passes.json"));
    const KeyOwner = ValidKeys[key];
    return KeyOwner;
}

function KeyCheck(res, key, token, Authentication, clientIp) {
    if (blacklist[token]) {
        res.status(401).send({ error: "Token is blacklisted" });
        return false;
    }

    if ((!token || !validateSessionToken(token, clientIp)) && (!key || !ValidateKey(key)) ) {
        res.status(401).send({ error: "API key needed" });
        return false;
    }

    return true;
}

app.get("/authenticate", async (req, res) => {
    const key = req.query.key;
    const clientIp = req.ip;

    if (!KeyCheck(res, key, req.query.session_token, true, clientIp)) return;

    const ValidKeys = JSON.parse(fs.readFileSync("./db/Passes.json"));
    const userId = ValidKeys[key];
    const token = generateSessionToken(userId, clientIp);
    console.log("Generating new token:", token);

    const Seconds = AuthTimeMins * 60;
    const Miliseconds = Seconds * 1000;

    res.cookie('session_token', token, { httpOnly: true, secure: true, maxAge: Miliseconds });
    return res.status(200).send({ success: true, message: 'Authentication successful!', token: token });
});

app.get("/validate", async (req, res) => {
    const token = req.query.session_token;
    const clientIp = req.ip;
    const IsValid = validateSessionToken(token, clientIp);

    if (IsValid){
        const payload = jwt.decode(token);
        const newToken = generateSessionToken(payload.userId, clientIp);
        invalidateToken(token); // Invalidate the old token
        res.status(200).send({ success: true, message: 'TokenValid', token: newToken });
    } else {
        res.status(403).send({ success: false, message: 'Token invalid', token: token });
    }
});


app.get("/api/tools/getBalance", async (req, res) => {
    if (!KeyCheck(res, req.query.key, req.query.session_token)) return;
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


app.get("/api/tools/generateWallet", async (req, res) => {
    if (!KeyCheck(res, req.query.key, req.query.session_token)) return;
    const keypair = Keypair.generate();
    const PubKey = keypair.publicKey.toBase58()
    const PrivKey = Buffer.from(keypair.secretKey).toString("hex")
    let Response = {}
    Response.publicKey = PubKey
    Response.privateKey = PrivKey
    res.status(200).send(Response);
});
app.get("/api/tools/scanner", async (req, res) => { //TODO add ratelimits for all methods
    if (!KeyCheck(res, req.query.key, req.query.session_token)) return; //TODO add support for private wallet scanning

    const AccountToScan = req.query.account

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Response = await AnalyseAccount(AccountToScan)
    if (typeof (Response) == "string") {
       return res.status(200).send({Response});

    }
    res.status(200).send(Response);
});
app.get("/api/tools/generateWallets", async (req, res) => {
    if (!KeyCheck(res, req.query.key)) return;
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