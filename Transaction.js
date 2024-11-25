const {Swap} = require("./Operations/PumpPortal.js")
function GetTime(raw) {
    const now = new Date();
    let time = raw 
        ? `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()},${now.getMilliseconds()}` 
        : `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;

    return time;
}
console.log(GetTime())
Swap("3v6gM9pQ6LqKBtcF2NdAAMnqNhkFeSRhoa6ktzG4pump", 1, 40, 0.0001, "buy")