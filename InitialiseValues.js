const fs = require('fs');
const BaseFilePath = './db/'

const BaseDataTemplate = {
    "PriorityFee": 0.0001,
    "MaxProportionSpending": 0.05,
    "MinimumSpending": 0.1,
    "MaxMarketCap": 0.02,
    "Halted": 0,
}
const path = BaseFilePath + "Values.json"
fs.writeFileSync(path, JSON.stringify(BaseDataTemplate, null, 2));
