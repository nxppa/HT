const walletData = {};
const fs = require('fs');
const QuickTradeThreshold = 30;
let PositionsCompleted = 0
// Helper function to calculate time difference
const calculateTimeDifference = (startTime, endTime) => {
  const parseTime = (timeStr) => {
    const [hours, minutes, seconds] = timeStr
      .replace(/\[|\]/g, '') // Remove brackets
      .split(':')
      .map(Number);
    const millis = seconds % 1;
    return (hours * 3600 + minutes * 60 + Math.floor(seconds)) * 1000 + millis * 1000;
  };

  const startMillis = parseTime(startTime);
  const endMillis = parseTime(endTime);

  return (endMillis - startMillis) / 1000; // Convert from milliseconds to seconds
};

function LoadDB(Database) {
  const Path = "./db/logs/" + Database;
  console.log(Path);
  if (fs.existsSync(Path)) {
    const data = fs.readFileSync(Path);
    let trades = JSON.parse(data);
    return trades;
  } else {
    console.log("File does not exist");
  }
}
let overallRevenue = 0;
let overallCost = 0;
const DB = LoadDB("OurTrades.json");
// Process each trade
DB.forEach(trade => {
  const { Wallet, Type, Cost, Amount, Mint, Time } = trade;
  const cost = parseFloat(Cost);
  const amount = parseFloat(Amount);

  if (isNaN(cost) || isNaN(amount)) {
    console.warn(`Invalid cost or amount in trade: ${JSON.stringify(trade)}`);
    return; // Skip this trade if cost or amount is invalid
  }

  if (!walletData[Wallet]) {
    walletData[Wallet] = {
      totalRevenue: 0, // Sum of sell values
      totalCost: 0, // Sum of buy values
      completedTrades: [],
      activePositions: {},
      totalPositions: 0,
      totalTime: 0,
      quickTrades: 0 // Counter for buy-sell pairs within QuickTradeThreshold seconds
    };
  }

  // If it's a buy, add it as an active position and accumulate total cost
  if (Type === 'buy') {
    walletData[Wallet].activePositions[Mint] = { cost, amount, time: Time };
  }

  // If it's a sell, calculate profit if there's a corresponding buy
  if (Type === 'sell' && walletData[Wallet].activePositions[Mint]) {
    const buy = walletData[Wallet].activePositions[Mint];

    // Calculate profit
    overallRevenue += cost * amount
    overallCost += buy.cost * amount
    PositionsCompleted += 1
    const profitValue = (cost - buy.cost) * amount;
    const profitPercent = ((cost / buy.cost) - 1) * 100;

    // Time difference
    const timeHeld = calculateTimeDifference(buy.time, Time);

    // Update wallet data
    walletData[Wallet].completedTrades.push({
      Mint,
      profitValue,
      profitPercent,
      timeHeld,
      buyCost: buy.cost,
      sellCost: cost
    });
    walletData[Wallet].totalCost += buy.cost * amount; // Add buy value to total cost
    walletData[Wallet].totalRevenue += cost * amount; // Add sell value to total revenue
    walletData[Wallet].totalPositions += 1;
    walletData[Wallet].totalTime += timeHeld;

    // Check if the trade was completed within the QuickTradeThreshold
    if (timeHeld <= QuickTradeThreshold) {
      walletData[Wallet].quickTrades += 1;
    }

    // Remove the position as it's completed
    delete walletData[Wallet].activePositions[Mint];
  }
});

// Generate the summary report as a dictionary
const report = {};


Object.entries(walletData).forEach(([wallet, data]) => {
    const avgProfitPercent = data.completedTrades.reduce((acc, t) => acc + t.profitPercent, 0) / data.completedTrades.length || 0;
    const avgTimeHeld = data.totalTime / data.totalPositions || 0;
    const quickTradePercentage = (data.quickTrades / data.totalPositions) * 100 || 0;

    // Calculate total profit as total revenue minus total cost
    const totalProfit = data.totalRevenue - data.totalCost;

    report[wallet] = {
        totalProfit: totalProfit,
        totalRevenue: data.totalRevenue,
        totalCost: data.totalCost,
        avgProfitPercent: avgProfitPercent,
        avgTimeHeld: avgTimeHeld,
        mostProfitableTrade: data.completedTrades.reduce((acc, t) => t.profitValue > acc.profitValue ? t : acc, { profitValue: 0 }),
        totalPositions: data.totalPositions,
        quickTrades: data.quickTrades,
        quickTradePercentage: quickTradePercentage
    };

    // Accumulate overall revenue and cost
});

// Calculate overall profit as total revenue minus total cost
const overallProfit = overallRevenue - overallCost;

// Identify the most valuable wallet
const mostValuableWallet = Object.entries(report).reduce((acc, [wallet, data]) => {
    return parseFloat(data.totalProfit) > parseFloat(acc.totalProfit) ? { wallet, ...data } : acc;
}, { totalProfit: '0.00000000' });

console.log("Trade Analysis Report:");
console.log("Overall Profit:", overallProfit.toFixed(8));
console.log("Amount Of Trades: ", PositionsCompleted)
console.log("Overall Revenue:", overallRevenue.toFixed(8));
console.log("Overall Cost:", overallCost.toFixed(8));
console.log("ROI: ", (overallProfit/overallCost*100).toFixed(8) + "%")
console.log("Details:", report);
