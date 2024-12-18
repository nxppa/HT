/**
 * Evaluates the profitability of copy trading a trader based on specified criteria.
 *
 * @param {Object} trader - An object containing the trader's data.
 * @param {number} trader.holdingTime - Average holding time in seconds.
 * @param {number} trader.purchasePercentageMC - Purchase percentage of Market Cap (0 to 1).
 * @param {number} trader.maxProportionSpending - Max proportion of spending of account (0 to 1).
 * @param {number} trader.winRate - Win rate (0 to 1).
 * @param {number} trader.openPositions - Number of open positions.
 * @param {number} trader.averageTradeInterval - Average interval between trades in seconds.
 *
 * @returns {number} A factor between 0 and 1 indicating the profitability of copy trading.
 */
function evaluateCopyTradeProfitability(trader) {
    // Define weights for each criterion
    const weights = {
        holdingTime: 0.20,            // 20%
        purchasePercentageMC: 0.15,   // 15%
        maxProportionSpending: 0.05,  // 5%
        winRate: 0.15,                 // 15%
        openPositions: 0.20,          // 20%
        tradeFrequency: 0.25           // 25%
    };

    /**
     * Helper function to calculate a linear score between 0 and 1 for criteria where higher values are better.
     * Clamps the result between 0 and 1.
     *
     * @param {number} value - The current value.
     * @param {number} min - The minimum desired value for a score of 0.
     * @param {number} max - The maximum desired value for a score of 1.
     * @returns {number} The calculated score.
     */
    function linearScoreAscending(value, min, max) {
        if (value <= min) return 0;
        if (value >= max) return 1;
        return (value - min) / (max - min);
    }

    /**
     * Helper function to calculate a linear score between 0 and 1 for criteria where lower values are better.
     * Clamps the result between 0 and 1.
     *
     * @param {number} value - The current value.
     * @param {number} min - The minimum desired value for a score of 1.
     * @param {number} max - The maximum desired value for a score of 0.
     * @returns {number} The calculated score.
     */
    function linearScoreDescending(value, min, max) {
        if (value <= min) return 1;
        if (value >= max) return 0;
        return 1 - ((value - min) / (max - min));
    }

    /**
     * Helper function to calculate an exponential score between 0 and 1.
     * Applies exponential decay for values below the threshold.
     *
     * @param {number} value - The current value.
     * @param {number} threshold - The threshold value.
     * @param {number} k - The decay constant controlling the steepness.
     * @returns {number} The calculated score.
     */
    function exponentialScore(value, threshold, k) {
        if (value >= threshold) return 1;
        return Math.exp(-k * (threshold - value));
    }

    // 1. Holding Time: Should be >30 seconds and <1 week (604800 seconds)
    let holdingTimeScore;
    if (trader.holdingTime < 30) {
        holdingTimeScore = 0; // Extremely bad
    } else if (trader.holdingTime >= 30 && trader.holdingTime < 60) {
        // Apply linear scoring between 30 and 60 seconds
        holdingTimeScore = linearScoreAscending(trader.holdingTime, 30, 60);
    } else {
        // Holding time >=60 seconds and <1 week
        holdingTimeScore = 1; // Ideal holding time
    }

    // 2. Purchase Percentage of MC: Should be <3.5% (0.035)
    let purchasePercentageMCScore;
    if (trader.purchasePercentageMC <= 0.035) {
        purchasePercentageMCScore = 1;
    } else if (trader.purchasePercentageMC > 0.035 && trader.purchasePercentageMC < 0.07) {
        // Penalize linearly from 3.5% to 7%
        purchasePercentageMCScore = linearScoreDescending(trader.purchasePercentageMC, 0.035, 0.07);
    } else {
        purchasePercentageMCScore = 0; // Worse than 7%
    }

    // 3. Max Proportion of Spending: Should be <5% (0.05)
    let maxProportionSpendingScore;
    if (trader.maxProportionSpending <= 0.05) {
        maxProportionSpendingScore = 1;
    } else if (trader.maxProportionSpending > 0.05 && trader.maxProportionSpending < 0.10) {
        // Penalize linearly from 5% to 10%
        maxProportionSpendingScore = linearScoreDescending(trader.maxProportionSpending, 0.05, 0.10);
    } else {
        maxProportionSpendingScore = 0; // Worse than 10%
    }

    // 4. Win Rate: Should be >60% (0.6)
    let winRateScore;
    if (trader.winRate >= 0.6) {
        winRateScore = 1;
    } else {
        // Apply exponential decay for win rates below 60%
        // Higher k makes the penalty steeper
        winRateScore = exponentialScore(trader.winRate, 0.6, 10); // k=10
    }

    // 5. Open Positions: Should be <100
    let openPositionsScore;
    if (trader.openPositions < 100) {
        openPositionsScore = 1;
    } else if (trader.openPositions >= 100 && trader.openPositions < 200) {
        // Penalize linearly from 100 to 200 positions
        openPositionsScore = linearScoreDescending(trader.openPositions, 100, 200);
    } else {
        openPositionsScore = 0; // Worse than 200 positions
    }

    // 6. Trade Frequency: Average interval should be >=25 seconds
    let tradeFrequencyScore;
    if (trader.averageTradeInterval >= 60) {
        tradeFrequencyScore = 1;
    } else if (trader.averageTradeInterval >= 25 && trader.averageTradeInterval < 60) {
        // Apply linear scoring between 25 and 60 seconds
        tradeFrequencyScore = linearScoreAscending(trader.averageTradeInterval, 25, 60);
    } else {
        // Apply exponential decay for trade intervals below 25 seconds
        tradeFrequencyScore = exponentialScore(trader.averageTradeInterval, 25, 5); // k=5
    }

    // Calculate the weighted scores multiplicatively
    const totalScore = (
        Math.pow(holdingTimeScore, weights.holdingTime) *
        Math.pow(purchasePercentageMCScore, weights.purchasePercentageMC) *
        Math.pow(maxProportionSpendingScore, weights.maxProportionSpending) *
        Math.pow(winRateScore, weights.winRate) *
        Math.pow(openPositionsScore, weights.openPositions) *
        Math.pow(tradeFrequencyScore, weights.tradeFrequency)
    );

    // Ensure the score is between 0 and 1
    return Math.min(Math.max(totalScore, 0), 1);
}

// Sample trader data representing a profitable trader
const profitableTrader = {
    holdingTime: 1200,               // 20 minutes in seconds (>60 seconds) 
    purchasePercentageMC: 0.04,      // 3% (<3.5%)
    maxProportionSpending: 0.04,     // 4% (<5%)
    winRate: 0.8,                    // 65% (>60%)
    openPositions: 80,               // 80 positions (<100)
    averageTradeInterval: 40          // 45 seconds (>25 and <=60)
};

// Evaluate profitability
const profitabilityFactor1 = evaluateCopyTradeProfitability(profitableTrader);
console.log(`Profitability Factor (Profitable Trader): ${profitabilityFactor1.toFixed(2)}`);
// Expected Output: Profitability Factor (Profitable Trader): ~0.40




async function AnalyseProfitability(Wallet){

}



