// Import Telegraf
import express from 'express';
import { Telegraf } from 'telegraf';

// Initialize the bot with your token
const bot = new Telegraf('');

// Define the target chat ID and the bot ID to respond to
const targetChatId = '-1001583376702';
const botId = 331761115; // CryptoWhale bot ID

// Setup Webhook
const app = express();
app.use(bot.webhookCallback('/webhook'));

const PORT = 3008;
const HOST = 'localhost'; // Update if exposing the container externally
const WEBHOOK_URL = ``;

// Start Express Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  try {
    // Set Webhook
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log(`Webhook set successfully: ${WEBHOOK_URL}`);
  } catch (err) {
    console.error('Error setting webhook:', err);
  }
});

// Listen for all messages in the target group
bot.on('message', async (ctx) => {
  try {
    console.log('Incoming message context:', JSON.stringify(ctx.message, null, 2)); // Log all messages for debugging

    // Ensure the message is from the target group
    if (String(ctx.chat.id) === targetChatId && ctx.message.text) {
      console.log('Message detected in target group:', ctx.message.text);

      // Check if the sender is the CryptoWhale bot
      if (ctx.message.from.id === botId) {
        console.log('Message is from CryptoWhale bot:', ctx.message.text);

        // Match the price in the message text
        const priceRegex = /ATOM\s+\$([0-9]+\.[0-9]{2})/;
        const match = ctx.message.text.match(priceRegex);

        if (match) {
          const price = match[1];
          console.log('Price extracted from message:', price); // Debugging extracted price
          const response = `and just like that atom will NEVER be under $${price} again`;

          // Respond in the group
          await ctx.reply(response);
          console.log('Response sent:', response); // Log the response sent
        } else {
          console.log('No price match found in CryptoWhale bot message'); // Debugging
        }
      } else {
        console.log('Message is not from CryptoWhale bot.'); // Debugging
      }
    } else {
      console.log('Message not from target group or does not have text.'); // Debugging
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
});

// Graceful Shutdown
process.once('SIGINT', async () => {
  await bot.telegram.deleteWebhook();
  console.log('Webhook deleted on SIGINT');
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await bot.telegram.deleteWebhook();
  console.log('Webhook deleted on SIGTERM');
  process.exit(0);
});
