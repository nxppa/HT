const express = require('express')
const app = express();
const port = 80
const BackupIp = "146.190.214.255"

const server = app.listen(port, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
  });

  app.get("*", async (req, res) => {
    res.send("t.me/nappa2");
  });