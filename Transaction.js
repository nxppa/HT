const {Swap} = require("./Operations/PumpPortal.js")
function GetTime(raw) {
    const now = new Date();
    let time = raw 
        ? `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()},${now.getMilliseconds()}` 
        : `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;

    return time;
}
console.log(GetTime())
Swap("FbwCKEyyEhCwfbde3Wzg7CFSSzfbwsa6HKLuNLjkpump", 1, 40, 0.0001, "buy")