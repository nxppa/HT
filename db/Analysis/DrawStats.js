const { createCanvas } = require('canvas');
const fs = require('fs');

function Draw(width, height, data, labels, barColors){

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Chart data and labels
    
    // Chart settings
    const chartWidth = 600;
    const chartHeight = 400;
    const chartTop = 80;
    const chartLeft = 100;
    const maxDataValue = 500; // Add some space above the max value
    const barWidth = chartWidth / data.length - 20;
    
    // Set background color
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Poop splatter analysis', width / 2, 40);
    

    
    // Draw x-axis and y-axis labels
    ctx.textAlign = 'center';
    ctx.fillText('Poops', chartLeft + chartWidth / 2, chartTop + chartHeight + 50);
    ctx.save();
    ctx.translate(chartLeft - 60, chartTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amount of poop (grams)', 0, 0);
    ctx.restore();
    
    // Draw bars
    data.forEach((value, index) => {
        const barHeight = (value / maxDataValue) * chartHeight * 2
        const x = chartLeft + index * (barWidth + 20);
        const y = chartTop + chartHeight - barHeight;
    
        // Draw each bar with color from barColors array
        ctx.fillStyle = barColors[index % barColors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
    
        // Draw value labels above each bar
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText(value, x + barWidth / 2, y - 10);
    
        // Draw category labels below each bar
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.fillText(labels[index], x + barWidth / 2, chartTop + chartHeight + 30);
    });
        // Draw grid lines and y-axis labels
        ctx.strokeStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#666';
        
        for (let i = 0; i <= 5; i++) {
            const y = chartTop + (chartHeight * i) / 5;
            const value = (-(maxDataValue/2.5*i-maxDataValue)).toFixed(0);
        
            // Draw grid line
            ctx.beginPath();
            ctx.moveTo(chartLeft, y);
            ctx.lineTo(chartLeft + chartWidth, y);
            ctx.stroke();
        
            // Draw y-axis label
            ctx.fillText(value, chartLeft - 10, y + 5);
        }
    // Save the canvas as a PNG file
    const out = fs.createWriteStream(__dirname + '/Images/PSA.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('The PNG file was created as "PSA.png".'));
    return out
}
// Define canvas size


module.exports = {Draw}