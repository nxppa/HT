const express = require('express')
const app = express();
const port = 80
const BackupIp = "146.190.214.255"

app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", port);
});
app.use(express.json())
app.get("TokenBal", async (req, res) => {
    console.log(req.body)
    res.status(200).send({
        Address: addy,
        Tokens: tokens,
    })
});
app.post("/TokenBal/:id", (req, res) => {
    const { Address } = req.params
})


