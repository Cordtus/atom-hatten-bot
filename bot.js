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

// cooldown maps
const priceCooldowns = new Map();
const commandCooldowns = new Map();

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

// check and set cooldowns
function isCooldownActive(chatId, cooldownMap) {
  const now = Date.now();
  return cooldownMap.has(chatId) && cooldownMap.get(chatId) > now;
}

function setCooldown(chatId, durationMs, cooldownMap) {
  const now = Date.now();
  cooldownMap.set(chatId, now + durationMs);
}

// chat listener
bot.on('text', async (ctx) => {
  try {
    if (!ctx.message.text || typeof ctx.message.text !== 'string') {
      console.log('Ignored non-text message');
      return;
    }

    const messageText = ctx.message.text.trim();

    // Ignore messages not starting with '/'
    if (!messageText.startsWith('/')) {
      console.log('Ignored message not starting with /');
      return;
    }

    const chatId = String(ctx.chat.id);

    // verify msg is from target chat
    if (chatId !== targetChatId) {
      console.log('Ignored message from non-target chat:', chatId);
      return;
    }

    // cooldowns
    const cooldownDuration = 10 * 60 * 1000; // 10 minutes

    if (messageText === '/price') {
      console.log('Matched /price command');

      if (isCooldownActive(chatId, priceCooldowns)) {
        console.log('Cooldown active for /price, ignoring message');
        return;
      }

      // price cooldown
      setCooldown(chatId, cooldownDuration, priceCooldowns);

      try {
        const price = await fetchAtomPrice();
        if (price !== null) {
          const response = `and just like that atom will NEVER be under $${price.toFixed(2)} again`;
          await ctx.reply(response);
          console.log('Price message sent:', response);
        } else {
          console.log('Could not retrieve price, no message sent.');
        }
      } catch (error) {
        console.error('Error fetching price immediately for /price command:', error);
      }
    } else {
      const atomCommandRegex = /^\/(?:p|mp)(?:\s+\S+)*\s+atom(?:\s+\S+)*$/;

      if (atomCommandRegex.test(messageText.toLowerCase())) {
        console.log('Matched /p or /mp command');

        if (isCooldownActive(chatId, commandCooldowns)) {
          console.log('Cooldown active for /p or /mp, ignoring message');
          return;
        }

        // p or mp cooldown
        setCooldown(chatId, cooldownDuration, commandCooldowns);

        // 3s wait before response
        const timer = setTimeout(async () => {
          try {
            const price = await fetchAtomPrice();
            if (price !== null) {
              const response = `and just like that atom will NEVER be under $${price.toFixed(2)} again`;
              await ctx.reply(response);
              console.log('Price message sent:', response);
            } else {
              console.log('Could not retrieve price, no message sent.');
            }
          } catch (error) {
            console.error('Error during delayed price fetch:', error);
          }
        }, 3000);

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
