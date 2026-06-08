const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const PREFIX = process.env.PREFIX || '!';

if (!TOKEN) {
  console.error('Thiếu TOKEN');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Sản phẩm trong store (bạn có thể sửa)
const products = [
  { id: '1', name: 'Áo thun', price: 50000, emoji: '👕' },
  { id: '2', name: 'Giày sneaker', price: 150000, emoji: '👟' },
  { id: '3', name: 'Mũ lưỡi trai', price: 30000, emoji: '🧢' },
  { id: '4', name: 'Balo', price: 200000, emoji: '🎒' }
];

client.once('ready', () => {
  console.log(`✅ Bot bán hàng đã online: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'shop') {
    const embed = new EmbedBuilder()
      .setTitle('🏪 Cửa hàng')
      .setColor(0x00AE86)
      .setDescription('Dùng `!mua <id>` để mua.')
      .setTimestamp();

    let desc = '';
    for (const p of products) {
      desc += `${p.emoji} **${p.name}** - ID: \`${p.id}\` - ${p.price.toLocaleString()} VND\n`;
    }
    embed.addFields({ name: 'Sản phẩm', value: desc || 'Chưa có sản phẩm.' });
    message.channel.send({ embeds: [embed] });
  }

  else if (command === 'mua' || command === 'buy') {
    const itemId = args[0];
    if (!itemId) return message.reply('Vui lòng nhập ID sản phẩm. VD: `!mua 1`');

    const product = products.find(p => p.id === itemId);
    if (!product) return message.reply('Sản phẩm không tồn tại.');

    const balance = await db.get(`money_${message.author.id}`) || 0;
    if (balance < product.price) {
      return message.reply(`Bạn không đủ tiền. Bạn có ${balance.toLocaleString()} VND, cần ${product.price.toLocaleString()} VND.`);
    }

    await db.sub(`money_${message.author.id}`, product.price);

    const order = {
      userId: message.author.id,
      username: message.author.tag,
      product: product.name,
      price: product.price,
      time: new Date().toISOString()
    };
    await db.push('orders', order);

    // Gửi thông báo cho chủ store
    if (OWNER_ID) {
      try {
        const owner = await client.users.fetch(OWNER_ID);
        await owner.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📦 Đơn hàng mới')
              .setColor(0x3498db)
              .addFields(
                { name: 'Khách hàng', value: `${message.author.tag} (${message.author.id})` },
                { name: 'Sản phẩm', value: `${product.emoji} ${product.name}` },
                { name: 'Giá', value: `${product.price.toLocaleString()} VND` },
                { name: 'Thời gian', value: new Date().toLocaleString() }
              )
          ]
        });
      } catch (e) {
        console.log('Không thể gửi tin nhắn cho owner:', e.message);
      }
    }

    message.reply(`✅ Đã mua **${product.name}**. Chủ store sẽ liên hệ giao hàng.`);
  }

  else if (command === 'balance' || command === 'money') {
    const balance = await db.get(`money_${message.author.id}`) || 0;
    message.reply(`💰 Số dư: **${balance.toLocaleString()} VND**`);
  }

  else if (command === 'daily') {
    const cooldown = 24 * 60 * 60 * 1000;
    const lastDaily = await db.get(`daily_${message.author.id}`);
    if (lastDaily && Date.now() - lastDaily < cooldown) {
      const remaining = cooldown - (Date.now() - lastDaily);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return message.reply(`⏰ Đã nhận daily rồi. Quay lại sau ${hours}h ${minutes}p.`);
    }

    const amount = 10000;
    await db.add(`money_${message.author.id}`, amount);
    await db.set(`daily_${message.author.id}`, Date.now());
    message.reply(`🎉 Nhận **${amount.toLocaleString()} VND**. Số dư: **${(await db.get(`money_${message.author.id}`)).toLocaleString()} VND**`);
  }

  else if (command === 'orders' && message.author.id === OWNER_ID) {
    const orders = await db.get('orders') || [];
    if (orders.length === 0) return message.reply('Chưa có đơn hàng nào.');
    const embed = new EmbedBuilder()
      .setTitle('📋 Lịch sử đơn hàng')
      .setColor(0x2ecc71);
    let text = '';
    orders.slice(-10).forEach((o, i) => {
      text += `**${i+1}.** ${o.username} mua ${o.product} - ${o.price.toLocaleString()} VND (${new Date(o.time).toLocaleString()})\n`;
    });
    embed.setDescription(text);
    message.channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
