const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const PREFIX = '!';

client.once('ready', () => {
  console.log(`✅ Test bot đã online: ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  
  // Lệnh ping đơn giản
  if (message.content === `${PREFIX}ping`) {
    message.reply('Pong! 🏓');
  }
});

client.login(TOKEN);
