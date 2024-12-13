const express = require('express');
const fs = require('fs');
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message } = require('@solana/web3.js');
const { publicKey } = require('@raydium-io/raydium-sdk');
const bcrypt = require('bcrypt');
const app = express();
const MaxWallets = 100
const port = 8080; //TODO make env files
const BackupIp = "142.93.123.245";
const ValidKeys = {
    "34a75bef08004f789e548e709171c8822af6aec25b32260a169d2ac384746ecf8a01b6eb0ff56653d1e4fb5361e2f10495edea7ef56ef8d42884fea2b061e605": "Nappa"
}
const SOLANA_RPC_ENDPOINT = "https://public.ligmanode.com" //TODO MAYBE make it use multiple endpoints 
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
  });

app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(express.json());


async function generateHash(password) {
    const saltRounds = 10; // The higher the number, the more secure (but slower) the hash generation
    try {
        // Generate the hash
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Hashed Password:', hash);
        return hash;
    } catch (error) {
        console.error('Error generating hash:', error);
    }
}

function Encode(Key){

}
function Decode(Key){
    
}

function KeyCheck(res, key){
    const ValidKeys = fs.readFileSync("./db/Passes.json");




    if (!key){
        res.status(400).send({ error: "API key needed" });
        return  false
    }
    const KeyOwner = ValidKeys[key]
    if (!KeyOwner){
        res.status(401).send({ error: "Invalid API key" });
        return  false
    }
    return true
}

app.get("/api/tools/scanner", async (req, res) => { //TODO add ratelimits for all methods
   if (!KeyCheck(res, req.query.key)) return;

    const AccountToScan = req.query.account

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Response = await AnalyseAccount(AccountToScan)
    if (typeof(Response) == "string") {
        return res.status(404).send({ error: Response });
    }
    res.status(200).send(Response);
});
app.get("/api/tools/generateWallet", async (req, res) => { 
    if (!KeyCheck(res, req.query.key)) return;
    const keypair = Keypair.generate();
    const PubKey = keypair.publicKey.toBase58()
    const PrivKey = Buffer.from(keypair.secretKey).toString("hex")
    let Response = {}
    Response.publicKey = PubKey
    Response.privateKey = PrivKey
    res.status(200).send(Response);
});
app.get("/api/tools/getBalance", async (req, res) => { 
    if (!KeyCheck(res, req.query.key)) return;
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

    const { password } = req.body;
    try {
        // Compare provided password with the stored hash
        const isMatch = await bcrypt.compare(password, userDatabase.passwordHash);

        if (isMatch) {
            res.json({ success: true, message: 'Authentication successful!' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});




app.get("/api/tools/generateWallets", async (req, res) => { 
    if (!KeyCheck(res, req.query.key)) return;
    const NumWallets = req.query.amount 
    if (!NumWallets){
        return res.status(400).send({ error: "Amount parameter is required" });
    }
    if (NumWallets > MaxWallets){
        return res.status(400).send({ error: `Amount of wallets must be under ${MaxWallets}` });
    }
    
    if (NumWallets < 1){
        return res.status(400).send({ error: `Amount of wallets must be over or equal to 1` });
    }

    let Response = {}
    Response.wallets = []
    for (let x = 1; x <NumWallets; x++){
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
