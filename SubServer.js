const express = require('express')
const app = express();
const port = 80
const BackupIp = "162.243.67.114"

const server = app.listen(PORT, BackupIp, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
  });