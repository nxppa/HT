const express = require('express');
const { AnalyseAccount } = require('./Getters/AccountAnalysis/AnalyseAccount');
const app = express();
const port = 8080;
const BackupIp = "142.93.123.245";
const ValidKeys = {
    "qwerty123": "Nappa"

}

app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(express.json());

function KeyCheck(res, key){
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

app.get("/api/tools/scanner", async (req, res) => {
    const ApiKey = req.query.key
   if (!KeyCheck(res, ApiKey)) return;

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

    if (!AccountToScan) {
        return res.status(400).send({ error: "Account parameter is required" });
    }
    const Response = await AnalyseAccount(AccountToScan)
    if (typeof(Response) == "string") {
        return res.status(404).send({ error: Response });
    }
    res.status(200).send(Response);
});


//TODO make sanity check; only allow requests from whitelisted ips
