const express = require('express');
const GetTokens = require("./Getters/TokenBalance/GetTokens")
const app = express();
const port = 80;
const BackupIp = "146.190.214.255";

// Mock data for demonstration
app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(express.json());

app.get("/TokenBal", async (req, res) => {
    const wallet = req.query.wallet; // Retrieve 'wallet' query parameter
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

// Optional: POST route for "TokenBal/:id" if needed
app.post("/TokenBal/:id", (req, res) => {
    const wallet = req.params.id; // Retrieve 'id' parameter from the URL
    console.log(`POST request for Wallet: ${wallet}`);
    res.status(200).send({ message: `POST request received for wallet ${wallet}` });
});
