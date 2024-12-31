// Import Telegraf and required modules
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';

// Initialize the bot with your token
const bot = new Telegraf('7541859084:AAFgtyE0cFG66QfY3wC2HwWdUHSCy4FunLs');

// Define the target chat ID
const targetChatId = '-1001583376702';

// Function to fetch the price of ATOM from CoinGecko
async function fetchAtomPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd');
    if (!response.ok) throw new Error('Failed to fetch price');
    const data = await response.json();
    if (data && data.cosmos && data.cosmos.usd) {
      return data.cosmos.usd;
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error fetching ATOM price:', error);
    return null;
  }
}

// Function to send a message with the current ATOM price
async function sendPriceMessage() {
  const price = await fetchAtomPrice();
  if (price !== null) {
    const response = `and just like that atom will NEVER be under $${price.toFixed(2)} again`;
    try {
      await bot.telegram.sendMessage(targetChatId, response);
      console.log('Price message sent:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  } else {
    console.log('Could not retrieve price, no message sent.');
  }
}

// Set an interval to check the price every 6 hours (21600000 ms)
setInterval(sendPriceMessage, 21600000);
// Add a command to manually trigger the price message
bot.command('price', async (ctx) => {
  try {
    await sendPriceMessage();
  } catch (error) {
    console.error('Error triggering manual price message:', error);
    ctx.reply('Failed to send price message. Please try again later.');
  }
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('Bot is running');
    // Send an initial message when the bot starts
    sendPriceMessage();
  })
  .catch((err) => console.error('Failed to launch bot:', err));

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
