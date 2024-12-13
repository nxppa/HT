const express = require('express');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
const { publicKey } = require('@raydium-io/raydium-sdk');
const app = express();
const MaxWallets = 100
const port = 3000; //TODO make env files
const BackupIp = "142.93.123.245";
const SECRET_KEY = 'your-very-secure-secret'; // Use an environment variable

function generateSessionToken(userId) {
    const issuedAt = Math.floor(Date.now() / 1000); // Current Unix timestamp
    const expiresAt = issuedAt + 8 * 60; // 8 minutes in seconds

    return jwt.sign({ userId, issuedAt, expiresAt }, SECRET_KEY);
}
function validateSessionToken(token) {
    try {
        const payload = jwt.verify(token, SECRET_KEY);
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.expiresAt < currentTime) {
            throw new Error('Token expired');
        }

        return payload.userId; // Valid user
    } catch (err) {
        return null; // Invalid or expired token
    }
}

const SOLANA_RPC_ENDPOINT = "https://public.ligmanode.com" //TODO MAYBE make it use multiple endpoints 
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
});

app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(cors({
    origin: 'chrome-extension://cdglhdpadffbnjbgbglpmkokgfdjmcll', // Allow your extension origin
}));



function KeyCheck(res, key, token, Authentication) {
    if (!Authentication){

        if (!token || !validateSessionToken(token)) {
            res.status(401).send('Unauthorized');
            return false
        }
    }

    console.log(key)
    const ValidKeys = JSON.parse(fs.readFileSync("./db/Passes.json"))
    if (!key) {
        res.status(400).send({ error: "API key needed" });
        return false
    }
    const KeyOwner = ValidKeys[key]

    if (!KeyOwner) {
        res.status(401).send({ error: "Invalid API key" });
        return false
    }
    return true
}

app.get("/api/tools/scanner", async (req, res) => { //TODO add ratelimits for all methods
    if (!KeyCheck(res, req.query.key, req.query.session_token)) return;

    const AccountToScan = req.query.account

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Response = await AnalyseAccount(AccountToScan)
    if (typeof (Response) == "string") {
        return res.status(404).send({ error: Response });
    }
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


app.get("/authenticate", async (req, res) => {

    if (!KeyCheck(res, req.query.key, req.query.session_token, true)) return;
    const token = generateSessionToken(username);
    res.cookie('session_token', token, { httpOnly: true, secure: true, maxAge: 480000 }); //TODO (8 minutes) Make it so that there is a universal variable for this 
    return res.status(200).send({ success: true, message: 'Authentication successful!' });

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
