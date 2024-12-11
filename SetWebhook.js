
require('dotenv').config();
const TelegramKey = process.env.TelegramKey;
const Domain = process.env.Domain
//https://api.telegram.org/bot7847350269:AAGru9IsC15r893fP2wbmvXt54bPAtn9TxE/sendMessage?url=bayharbour.boats/

function SetWebhook() {
    const WebhookUrl = `https://api.telegram.org/bot7847350269:AAGru9IsC15r893fP2wbmvXt54bPAtn9TxE/setWebhook?url=bayharbour.boats/`

    fetch(WebhookUrl, {
        method: 'GET',

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
