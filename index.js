const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`✅ TEST OK - Bot đã online: ${client.user.tag}`);
  process.exit(0); // dừng ngay sau khi test thành công
});

client.login(process.env.TOKEN).catch(err => {
  console.error('❌ Lỗi đăng nhập:', err.message);
  process.exit(1);
});
