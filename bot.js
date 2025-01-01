// bot.js

import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// validate env
if (!process.env.BOT_TOKEN || !process.env.TARGET_CHAT_ID) {
  console.error('Missing BOT_TOKEN or TARGET_CHAT_ID in .env file');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

const targetChatId = process.env.TARGET_CHAT_ID;

// cooldown map
const cooldowns = new Map();

// fetch price
async function fetchAtomPrice() {
  try {
    const response = await fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd');
    if (response && response.cosmos && response.cosmos.usd) {
      return response.cosmos.usd;
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error fetching ATOM price:', error);
    return null;
  }
}

// api call retry
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err);
      if (i === retries - 1) throw err;
    }
  }
}

// check and set global cooldown
function isCooldownActive(chatId) {
  const now = Date.now();
  return cooldowns.has(chatId) && cooldowns.get(chatId) > now;
}

function setCooldown(chatId, durationMs) {
  if (!isCooldownActive(chatId)) { // prevent compounding cooldown timer
    const now = Date.now();
    cooldowns.set(chatId, now + durationMs);
  }
}

// chat listener
bot.on('text', async (ctx) => {
  try {
    // Ignore messages not starting with '/'
    if (!ctx.message.text.startsWith('/')) {
      console.log('Ignored message not starting with /');
      return;
    }

    const chatId = String(ctx.chat.id);

    // check cooldown
    if (isCooldownActive(chatId)) {
      console.log('Cooldown active, ignoring message');
      return;
    }

    // verify message is in target group
    if (chatId === targetChatId) {
      const messageText = ctx.message.text.toLowerCase();

      // batch commands
      const atomCommandRegex = /^\/(?:p|mp)(?:\s+\S+)*\s+atom(?:\s+\S+)*$/;
      if (atomCommandRegex.test(messageText)) {
        console.log('Matched command, waiting for bot response');

        // set cooldown timestamp
        setCooldown(chatId, 10 * 60 * 1000); // 10 minutes

        // 3s wait before responding
        const timer = setTimeout(async () => {
          try {
            const price = await fetchAtomPrice();
            if (price !== null) {
              const response = `and just like that atom will NEVER be under $${price.toFixed(2)} again`;
              try {
                await ctx.reply(response);
                console.log('Price message sent:', response);
              } catch (error) {
                console.error('Error sending message:', error);
              }
            } else {
              console.log('Could not retrieve price, no message sent.');
            }
          } catch (error) {
            console.error('Error during delayed price fetch:', error);
          }
        }, 3000);

        // store timer for cleanup on shutdown
        timers.add(timer);
      }
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
});

// timer management for graceful shutdown
const timers = new Set();
function clearAllTimers() {
  for (const timer of timers) {
    clearTimeout(timer);
  }
  timers.clear();
}

// start bot
bot.launch()
  .then(() => {
    console.log('Bot is running');
  })
  .catch((err) => console.error('Failed to launch bot:', err));

// graceful shutdown
process.once('SIGINT', () => {
  clearAllTimers();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  clearAllTimers();
  bot.stop('SIGTERM');
});
