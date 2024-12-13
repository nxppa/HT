const express = require('express');
const app = express();

const port = 8080;
const BackupIp = "142.93.123.245";


app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(express.json());


app.get("/TokenBal", async (req, res) => {
    const wallet = req.query.wallet
    console.log(`Requested Token Balance for Wallet: ${wallet}`);
    if (!wallet) {
        return res.status(400).send({ error: "Wallet parameter is required" });
    }

    const tokenBalance = await GetTokens(wallet)
    if (!tokenBalance) {
        return res.status(404).send({ error: "Wallet not found" });
    }


    res.status(200).send(tokenBalance);
});

app.post("/TokenBal/:id", (req, res) => {
    const wallet = req.params.id;
    console.log(`POST request for Wallet: ${wallet}`);
    res.status(200).send({ message: `POST request received for wallet ${wallet}` });
});


//TODO make sanity check; only allow requests from whitelisted ips