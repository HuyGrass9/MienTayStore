const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require('discord.js');

const { QuickDB } = require('quick.db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const db = new QuickDB();

const PREFIX = "!";
const OWNER_ID = process.env.OWNER_ID;

const products = [
  {
    id: "1",
    name: "Nitro Basic",
    price: 50000,
    emoji: "💎"
  },
  {
    id: "2",
    name: "Acc Roblox",
    price: 100000,
    emoji: "🎮"
  },
  {
    id: "3",
    name: "Premium",
    price: 30000,
    emoji: "🔥"
  }
];

client.once("ready", () => {
  console.log(`✅ Online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // =========================
  // SHOP
  // =========================

  if (command === "shop") {

    const embed = new EmbedBuilder()
      .setTitle("🛒 MIENTAY STORE")
      .setDescription(
        products.map(p =>
          `${p.emoji} ID: \`${p.id}\` • **${p.name}** • ${p.price.toLocaleString()}đ`
        ).join("\n")
      )
      .setColor("Green")
      .setFooter({
        text: "Dùng !mua <id>"
      });

    return message.channel.send({
      embeds: [embed]
    });
  }

  // =========================
  // DAILY
  // =========================

  if (command === "daily") {

    const lastDaily = await db.get(`daily_${message.author.id}`);

    if (lastDaily && Date.now() - lastDaily < 86400000) {

      const timeLeft = Math.ceil(
        (86400000 - (Date.now() - lastDaily)) / 3600000
      );

      return message.reply(
        `⏰ Bạn đã nhận daily rồi.\nQuay lại sau ${timeLeft} giờ nữa.`
      );
    }

    await db.add(`money_${message.author.id}`, 50000);
    await db.set(`daily_${message.author.id}`, Date.now());

    return message.reply(
      "💰 Bạn đã nhận 50,000đ daily."
    );
  }

  // =========================
  // MONEY
  // =========================

  if (command === "money") {

    const money = await db.get(`money_${message.author.id}`) || 0;

    return message.reply(
      `💵 Bạn có ${money.toLocaleString()}đ`
    );
  }

  // =========================
  // MUA
  // =========================

  if (command === "mua") {

    const productId = args[0];

    if (!productId) {
      return message.reply(
        `❌ Vui lòng nhập ID sản phẩm.\nVD: !mua 1`
      );
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
      return message.reply(
        "❌ Không tìm thấy sản phẩm."
      );
    }

    const money = await db.get(`money_${message.author.id}`) || 0;

    if (money < product.price) {
      return message.reply(
        `❌ Bạn không đủ tiền.\nCần thêm ${(product.price - money).toLocaleString()}đ`
      );
    }

    await db.sub(`money_${message.author.id}`, product.price);

    // Gửi DM owner
    try {

      const owner = await client.users.fetch(OWNER_ID);

      const orderEmbed = new EmbedBuilder()
        .setTitle("📦 ĐƠN HÀNG MỚI")
        .addFields(
          {
            name: "👤 Khách",
            value: `${message.author.tag}`
          },
          {
            name: "🛒 Sản phẩm",
            value: product.name
          },
          {
            name: "💰 Giá",
            value: `${product.price.toLocaleString()}đ`
          }
        )
        .setColor("Blue")
        .setTimestamp();

      await owner.send({
        embeds: [orderEmbed]
      });

    } catch (err) {
      console.log("Không gửi được DM owner.");
    }

    return message.reply(
      `✅ Đã mua **${product.name}**.\nChủ store sẽ liên hệ giao hàng.`
    );
  }

});

client.login(process.env.TOKEN);
