const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = process.env.PREFIX || '!';
const OWNER_ID = process.env.OWNER_ID; // Discord ID của bạn

// Danh sách sản phẩm (bạn có thể sửa theo ý)
const products = [
  { id: '1', name: 'Áo thun', price: 50000, emoji: '👕' },
  { id: '2', name: 'Giày sneaker', price: 150000, emoji: '👟' },
  { id: '3', name: 'Mũ lưỡi trai', price: 30000, emoji: '🧢' },
  { id: '4', name: 'Balo', price: 200000, emoji: '🎒' }
];

client.once('ready', () => {
  console.log(`${client.user.tag} đã sẵn sàng!`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Lệnh shop
  if (command === 'shop') {
    const embed = new EmbedBuilder()
      .setTitle('🏪 Cửa hàng của Server')
      .setColor(0x00AE86)
      .setDescription('Dùng `!mua <id>` để đặt mua sản phẩm.')
      .setTimestamp();

    let desc = '';
    for (const p of products) {
      desc += `${p.emoji} **${p.name}** - ID: \`${p.id}\` - Giá: ${p.price.toLocaleString()} VND\n`;
    }
    embed.addFields({ name: 'Sản phẩm', value: desc || 'Không có sản phẩm nào.' });
    message.channel.send({ embeds: [embed] });
  }

  // Lệnh mua hàng
  else if (command === 'mua' || command === 'buy') {
    const itemId = args[0];
    if (!itemId) return message.reply('Vui lòng nhập ID sản phẩm. VD: `!mua 1`');

    const product = products.find(p => p.id === itemId);
    if (!product) return message.reply('Sản phẩm không tồn tại.');

    // Kiểm tra số dư
    const balance = await db.get(`money_${message.author.id}`) || 0;
    if (balance < product.price) {
      return message.reply(`Bạn không đủ tiền. Bạn có ${balance.toLocaleString()} VND, cần ${product.price.toLocaleString()} VND.`);
    }

    // Trừ tiền
    await db.sub(`money_${message.author.id}`, product.price);

    // Lưu đơn hàng
    const order = {
      userId: message.author.id,
      username: message.author.tag,
      product: product.name,
      price: product.price,
      time: new Date().toISOString()
    };
    await db.push('orders', order);

    // Gửi thông báo cho chủ store
    try {
      const owner = await client.users.fetch(OWNER_ID);
      if (owner) {
        owner.send(`📦 **Đơn hàng mới** từ ${message.author.tag} (ID: ${message.author.id})\n` +
                   `Sản phẩm: ${product.emoji} ${product.name}\n` +
                   `Giá: ${product.price.toLocaleString()} VND\n` +
                   `Thời gian: ${new Date().toLocaleString()}`);
      }
    } catch (e) {
      console.log('Không thể gửi tin nhắn cho owner: ', e);
    }

    message.reply(`✅ Bạn đã mua thành công **${product.name}**. Chủ store sẽ liên hệ để giao hàng.`);
  }

  // Lệnh xem số dư
  else if (command === 'balance' || command === 'money') {
    const balance = await db.get(`money_${message.author.id}`) || 0;
    message.reply(`💰 Số dư của bạn: **${balance.toLocaleString()} VND**`);
  }

  // Lệnh daily (nhận tiền mỗi ngày)
  else if (command === 'daily') {
    const cooldown = 24 * 60 * 60 * 1000; // 24 giờ
    const lastDaily = await db.get(`daily_${message.author.id}`);
    if (lastDaily && Date.now() - lastDaily < cooldown) {
      const remaining = cooldown - (Date.now() - lastDaily);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return message.reply(`⏰ Bạn đã nhận daily rồi. Vui lòng quay lại sau ${hours} giờ ${minutes} phút.`);
    }

    const amount = 10000; // Số tiền tặng mỗi ngày
    await db.add(`money_${message.author.id}`, amount);
    await db.set(`daily_${message.author.id}`, Date.now());
    message.reply(`🎉 Bạn đã nhận **${amount.toLocaleString()} VND** tiền thưởng hàng ngày. Số dư mới: **${(await db.get(`money_${message.author.id}`)).toLocaleString()} VND**`);
  }

  // Lệnh xem lịch sử đơn hàng (chỉ owner)
  else if (command === 'orders' && message.author.id === OWNER_ID) {
    const orders = await db.get('orders') || [];
    if (orders.length === 0) return message.reply('Chưa có đơn hàng nào.');
    const embed = new EmbedBuilder()
      .setTitle('📋 Lịch sử đơn hàng')
      .setColor(0x3498db);
    let text = '';
    orders.slice(-10).forEach((o, i) => {
      text += `**${i+1}.** ${o.username} mua ${o.product} (${o.price.toLocaleString()} VND) lúc ${new Date(o.time).toLocaleString()}\n`;
    });
    embed.setDescription(text);
    message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);