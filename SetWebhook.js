
require('dotenv').config();
const TelegramKey = process.env.TelegramKey;
const Domain = process.env.Domain
function SetWebhook() {
    const WebhookUrl = `https://api.telegram.org/bot${TelegramKey}/setWebhook?url=${Domain}/`

    fetch(WebhookUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Expose-Headers': 'Content-Length,Content-Type,Date,Server,Connection'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json()
        })
        .then(data => {
            console.log(data)
        })
        .catch(error => {
            console.log('There was an error with the request:', error);
        });
}


SetWebhook()
