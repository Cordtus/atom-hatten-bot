// Import Telegraf
import { Telegraf } from 'telegraf';

// Initialize the bot with your token
const bot = new Telegraf('7541859084:AAFgtyE0cFG66QfY3wC2HwWdUHSCy4FunLs');

// Define the target chat ID and the bot ID to respond to
const targetChatId = '-1001583376702';
const botId = 331761115; // CryptoWhale bot ID

// Global logging for incoming updates
bot.use((ctx, next) => {
  console.log('Incoming update:', JSON.stringify(ctx.update, null, 2)); // Log entire update object in detail
  return next();
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

// Start the bot
bot.launch()
  .then(() => console.log('Bot is running'))
  .catch((err) => console.error('Failed to launch bot:', err));

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
