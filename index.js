const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const config = require('./config');

// Çoklu bot sistemi için global değişkenler
const bots = new Map(); // Bot instances
const globalCheckedUsers = new Set(); // Tüm botlar için ortak kontrol edilen kullanıcılar
let activeServers = new Set(); // Aktif sunucular
let serverList = [];

// Hata yönetimi için değişkenler
const failedTokens = new Set(); // Başarısız token'lar
const successfulBots = new Map(); // Başarılı bot'lar
let ownerClient = null; // Owner'a mesaj gönderecek bot

// Dosya yolları
const userDataPath = path.join(__dirname, 'data', 'user.json');
const noUserDataPath = path.join(__dirname, 'data', 'nouser.json');
const serversDataPath = path.join(__dirname, 'data', 'servers.json');

// User.json dosyasını yükle
async function loadUserData() {
    try {
        const data = await fs.readFile(userDataPath, 'utf8');
        const users = JSON.parse(data);
        const userIds = users.map(user => user.userId);
        userIds.forEach(id => globalCheckedUsers.add(id));
        return users;
    } catch (error) {
        return [];
    }
}

// User.json dosyasına kaydet
async function saveUserData(userData) {
    try {
        await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));
    } catch (error) {
        console.error('User data kaydedilemedi:', error);
    }
}

// Sunucu listesini yükle
async function loadServerData() {
    try {
        const data = await fs.readFile(serversDataPath, 'utf8');
        const servers = JSON.parse(data);
        activeServers = new Set(servers);
        serverList = [...servers];
        return servers;
    } catch (error) {
        return [];
    }
}

// Sunucu listesini kaydet
async function saveServerData(servers) {
    try {
        await fs.writeFile(serversDataPath, JSON.stringify(servers, null, 2));
    } catch (error) {
        console.error('Server data kaydedilemedi:', error);
    }
}

// NoUser.json dosyasını yükle
async function loadNoUserData() {
    try {
        const data = await fs.readFile(noUserDataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// NoUser.json dosyasına kaydet
async function saveNoUserData(userData) {
    try {
        await fs.writeFile(noUserDataPath, JSON.stringify(userData, null, 2));
    } catch (error) {
        console.error('NoUser data kaydedilemedi:', error);
    }
}

// Early Bot Developer rozeti kontrolü
function hasEarlyBotDeveloperBadge(user) {
    if (!user.flags || !user.flags.has) return false;
    const EARLY_BOT_DEVELOPER = 1 << 9;
    return user.flags.has(EARLY_BOT_DEVELOPER);
}

// Boost süresi kontrolü (24 ay ve üzeri)
function hasLongTermBoost(member) {
    if (!member.premiumSince) return false;
    
    const boostStartDate = new Date(member.premiumSince);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - boostStartDate.getFullYear()) * 12 + 
                      (now.getMonth() - boostStartDate.getMonth());
    
    return monthsDiff >= 24;
}

// Hatalı token bildirim sistemi
async function notifyFailedToken(token, error, botIndex) {
    const maskedToken = token.substring(0, 20) + '...' + token.substring(token.length - 10);
    
    // Konsola hata yazdır
    console.error(`❌ [Bot #${botIndex + 1}] TOKEN HATASI: ${maskedToken}`);
    console.error(`❌ [Bot #${botIndex + 1}] Hata Detayı: ${error.message}`);
    
    // Önce DM ile göndermeyi dene
    let dmSent = false;
    if (ownerClient && ownerClient.readyAt) {
        try {
            const owner = await ownerClient.users.fetch(config.ownerID);
            await owner.send(`❌ **TOKEN HATASI - Bot #${botIndex + 1}**\n\n` +
                           `🔑 **Token:** \`${maskedToken}\`\n` +
                           `❗ **Hata:** ${error.message}\n` +
                           `⏰ **Zaman:** ${new Date().toLocaleString('tr-TR')}\n\n` +
                           `Bu token geçersiz veya rate limit'e takılmış olabilir.`);
            dmSent = true;
            console.log(`✅ [Bot #${botIndex + 1}] Hata bildirimi DM ile gönderildi`);
        } catch (dmError) {
            console.error(`❌ [Bot #${botIndex + 1}] DM gönderilemedi:`, dmError.message);
        }
    }
    
    // DM gönderilemezse webhook ile bildir
    if (!dmSent) {
        try {
            await sendTokenErrorWebhook(token, error, botIndex);
        } catch (webhookError) {
            console.error(`❌ [Bot #${botIndex + 1}] Webhook bildirimi de gönderilemedi:`, webhookError.message);
        }
    }
}

// Webhook ile token hatası bildirimi
async function sendTokenErrorWebhook(token, error, botIndex) {
    try {
        const webhookUrl = config.Webhook;
        const maskedToken = token.substring(0, 20) + '...' + token.substring(token.length - 10);
        
        const embed = {
            title: "🚨 TOKEN HATASI",
            description: `Bot #${botIndex + 1} başlatılamadı!`,
            color: 0xff0000, // Kırmızı
            fields: [
                {
                    name: "🤖 Bot Bilgisi",
                    value: `**Bot Numarası:** #${botIndex + 1}\n**Toplam Bot:** ${config.tokens.length}`,
                    inline: true
                },
                {
                    name: "🔑 Token Bilgisi",
                    value: `**Token:** \`${maskedToken}\`\n**Durum:** ❌ Geçersiz/Hatalı`,
                    inline: true
                },
                {
                    name: "❗ Hata Detayı",
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false
                },
                {
                    name: "📋 Öneriler",
                    value: "• Token'ın doğru olduğundan emin olun\n" +
                           "• Self-bot token kullandığınızdan emin olun\n" +
                           "• Rate limit kontrolü yapın\n" +
                           "• Token'ı yeniden oluşturmayı deneyin",
                    inline: false
                },
                {
                    name: "📊 Sistem Durumu",
                    value: `**Başarılı Bot:** ${successfulBots.size}/${config.tokens.length}\n` +
                           `**Başarısız Bot:** ${failedTokens.size + 1}/${config.tokens.length}`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Multi-Bot Token Error System",
                icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
            }
        };

        const payload = {
            content: `<@${config.ownerID}> TOKEN HATASI RAPORU!`,
            embeds: [embed],
            username: "Token Error Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png"
        };

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://discord.com, 1.0)'
        };

        const response = await axios.post(webhookUrl, payload, { headers });
        console.log(`✅ [Bot #${botIndex + 1}] Token hatası webhook ile bildirildi - Status: ${response.status}`);
    } catch (error) {
        console.error(`❌ [Bot #${botIndex + 1}] Token hatası webhook'u gönderilemedi:`, error.response?.data || error.message);
    }
}

// Başarılı bot bildirimi
async function notifySuccessfulBot(client, botIndex) {
    const username = client.user.username;
    console.log(`✅ [Bot #${botIndex + 1}] BAŞARILI GİRİŞ: ${username}`);
    
    // İlk başarılı bot'u owner client olarak ata
    if (!ownerClient) {
        ownerClient = client;
        console.log(`👑 [Bot #${botIndex + 1}] Owner client olarak atandı: ${username}`);
    }
    
    successfulBots.set(botIndex, {
        username: username,
        loginTime: new Date(),
        client: client
    });
}

// Log kanalına mesaj gönder (Webhook kullanarak)
async function sendLogMessage(user, member, boostMonths, guild, hasEarlyBotDev, hasLongBoost, botIndex) {
    try {
        const webhookUrl = config.Webhook;
        
        const bothConditions = hasEarlyBotDev && hasLongBoost;
        const oneCondition = hasEarlyBotDev || hasLongBoost;
        
        let embedColor;
        if (bothConditions) {
            embedColor = 0x0099ff; // Mavi - Her iki koşul
        } else if (oneCondition) {
            embedColor = 0xff9900; // Turuncu - Sadece bir koşul
        } else {
            embedColor = 0xff0000; // Kırmızı - Hiçbir koşul (debug için)
        }
        
        const earlyBotStatus = hasEarlyBotDev ? "✅ Early Bot Developer" : "❌ Early Bot Developer";
        const boostStatus = hasLongBoost ? `✅ Long Term Booster (${boostMonths} ay)` : "❌ Long Term Booster";

        let avatarUrl;
        try {
            avatarUrl = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true, size: 128 }) : 
                       (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 
                       "https://cdn.discordapp.com/embed/avatars/0.png");
        } catch (avatarError) {
            avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
        }

        const embed = {
            title: "🎯 Kullanıcı Kontrol Sonucu",
            description: `**${user.username}** için kontrol tamamlandı`,
            color: embedColor,
            fields: [
                {
                    name: "👤 Kullanıcı Bilgisi",
                    value: `**ID:** ${user.id}\n**Username:** ${user.username}#${user.discriminator}\n**Mention:** <@${user.id}>`,
                    inline: true
                },
                {
                    name: "🏠 Sunucu Bilgisi",
                    value: `**Sunucu:** ${guild.name}\n**Sunucu ID:** ${guild.id}`,
                    inline: true
                },
                {
                    name: "🤖 Bot Bilgisi",
                    value: `**Bot:** #${botIndex + 1}\n**Toplam Bot:** ${config.tokens.length}`,
                    inline: true
                },
                {
                    name: "🎖️ Rozet Durumu",
                    value: earlyBotStatus,
                    inline: true
                },
                {
                    name: "⚡ Boost Durumu",
                    value: boostStatus,
                    inline: true
                },
                {
                    name: "📊 Özet",
                    value: bothConditions ? "🔵 Her iki koşul karşılanıyor!" : 
                           oneCondition ? "🟠 En az bir koşul karşılanıyor" : 
                           "🔴 Hiçbir koşul karşılanmıyor",
                    inline: false
                }
            ],
            thumbnail: {
                url: avatarUrl
            },
            timestamp: new Date().toISOString(),
            footer: {
                text: `Multi-Bot Scanner | Bot #${botIndex + 1}`,
                icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
            }
        };

        const payload = {
            embeds: [embed],
            username: "Badge Scanner",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png"
        };

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://discord.com, 1.0)'
        };

        const response = await axios.post(webhookUrl, payload, { headers });
        console.log(`✅ [Bot #${botIndex + 1}] Webhook log gönderildi: ${user.username}#${user.discriminator} (${guild.name}) - Status: ${response.status}`);
    } catch (error) {
        console.error(`❌ [Bot #${botIndex + 1}] Webhook log mesajı gönderilemedi:`, error.response?.data || error.message);
        
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 1;
            console.log(`⏰ [Bot #${botIndex + 1}] Rate limit! ${retryAfter} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        }
    }
}

// Bot class - Her bot için ayrı instance
class ScannerBot {
    constructor(token, botIndex) {
        this.token = token;
        this.botIndex = botIndex;
        this.client = new Client();
        this.currentUserIndex = 0;
        this.allUsers = [];
        this.currentServerIndex = 0;
        this.checkedUsers = new Set();
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('ready', async () => {
            console.log(`🤖 [Bot #${this.botIndex + 1}] ${this.client.user.username} olarak giriş yapıldı!`);
            
            // Başarılı giriş bildirimi
            await notifySuccessfulBot(this.client, this.botIndex);
            
            if (this.botIndex === 0) {
                // İlk bot için genel ayarları yazdır
                console.log(`👤 Sahip ID: ${config.ownerID}`);
                console.log(`📢 Log Kanalı ID: ${config.logChannelId}`);
                console.log(`⏱️ Kontrol Aralığı: ${config.checkInterval / 1000} saniye`);
                console.log(`👥 Bot Başına Max Kontrol: ${config.maxUsersPerCheck} kullanıcı`);
                console.log(`🔢 Toplam Bot Sayısı: ${config.tokens.length}`);
                console.log('═'.repeat(50));
            }

            // Sunucu listesini yükle (sadece ilk bot için)
            if (this.botIndex === 0) {
                await loadServerData();
                console.log(`🏠 ${serverList.length} sunucu aktif listede.`);
            }

            // Eğer sunucu varsa kontrolü başlat
            if (serverList.length > 0) {
                // Her bot için farklı gecikme ile başlat
                const startDelay = this.botIndex * config.multiBot.staggerDelay;
                setTimeout(() => {
                    console.log(`🚀 [Bot #${this.botIndex + 1}] Kullanıcı kontrolü başlatılıyor... (${startDelay}ms gecikme)`);
                    this.checkUsers();
                    setInterval(() => this.checkUsers(), config.checkInterval);
                }, startDelay);
            }
        });

        // Sadece ilk bot DM komutlarını dinler
        if (this.botIndex === 0) {
            this.client.on('messageCreate', async (message) => {
                if (message.author.id !== config.ownerID || message.channel.type !== 'DM') return;

                const args = message.content.trim().split(/\s+/);
                const command = args[0].toLowerCase();

                try {
                    switch (command) {
                        case '+add': {
                            if (!args[1]) {
                                await message.reply('❌ Sunucu ID\'si belirtmelisiniz!\nKullanım: `+add SUNUCU_ID`');
                                return;
                            }

                            const guildId = args[1];
                            let guild = null;
                            
                            // Tüm botlarda sunucuyu ara
                            for (const [index, bot] of bots.entries()) {
                                guild = bot.client.guilds.cache.get(guildId);
                                if (guild) {
                                    console.log(`📍 Sunucu Bot #${index + 1}'de bulundu: ${guild.name}`);
                                    break;
                                }
                            }
                            
                            if (!guild) {
                                await message.reply(`❌ Sunucu bulunamadı! ID: \`${guildId}\`\nHiçbir botun bu sunucuda olmadığından emin olun.`);
                                return;
                            }

                            if (activeServers.has(guildId)) {
                                await message.reply(`⚠️ Bu sunucu zaten listede!\n**Sunucu:** ${guild.name}`);
                                return;
                            }

                            activeServers.add(guildId);
                            serverList = [...activeServers];
                            await saveServerData(serverList);

                            await message.reply(`✅ Sunucu başarıyla eklendi!\n**Sunucu:** ${guild.name}\n**ID:** ${guildId}\n**Toplam Sunucu:** ${serverList.length}\n**Toplam Bot:** ${config.tokens.length}`);
                            
                            console.log(`➕ Sunucu eklendi: ${guild.name} (${guildId})`);
                            break;
                        }

                        case '+remove': {
                            if (!args[1]) {
                                await message.reply('❌ Sunucu ID\'si belirtmelisiniz!\nKullanım: `+remove SUNUCU_ID`');
                                return;
                            }

                            const guildId = args[1];
                            
                            if (!activeServers.has(guildId)) {
                                await message.reply(`❌ Bu sunucu listede değil!\nID: \`${guildId}\``);
                                return;
                            }

                            let guildName = 'Bilinmeyen Sunucu';
                            for (const bot of bots.values()) {
                                const guild = bot.client.guilds.cache.get(guildId);
                                if (guild) {
                                    guildName = guild.name;
                                    break;
                                }
                            }

                            activeServers.delete(guildId);
                            serverList = [...activeServers];
                            await saveServerData(serverList);

                            await message.reply(`✅ Sunucu başarıyla kaldırıldı!\n**Sunucu:** ${guildName}\n**ID:** ${guildId}\n**Kalan Sunucu:** ${serverList.length}`);
                            
                            console.log(`➖ Sunucu kaldırıldı: ${guildName} (${guildId})`);
                            break;
                        }

                        case '+list': {
                            if (serverList.length === 0) {
                                await message.reply('📋 Aktif sunucu listesi boş.\n\nSunucu eklemek için: `+add SUNUCU_ID`');
                                return;
                            }

                            let listMessage = `📋 **Aktif Sunucu Listesi** (${serverList.length} sunucu)\n`;
                            listMessage += `🤖 **Toplam Bot Sayısı:** ${config.tokens.length}\n\n`;
                            
                            for (let i = 0; i < serverList.length; i++) {
                                const guildId = serverList[i];
                                let guild = null;
                                let botNumber = 0;
                                
                                // Sunucuyu hangi bot(lar)da bulunduğunu kontrol et
                                for (const [index, bot] of bots.entries()) {
                                    const foundGuild = bot.client.guilds.cache.get(guildId);
                                    if (foundGuild) {
                                        guild = foundGuild;
                                        botNumber = index + 1;
                                        break;
                                    }
                                }
                                
                                const guildName = guild ? guild.name : 'Bilinmeyen Sunucu';
                                const memberCount = guild ? guild.memberCount : 'Bilinmiyor';
                                
                                listMessage += `${i + 1}. **${guildName}**\n`;
                                listMessage += `   └ ID: \`${guildId}\`\n`;
                                listMessage += `   └ Üye Sayısı: ${memberCount}\n`;
                                listMessage += `   └ Bot #${botNumber}'de mevcut\n\n`;
                            }

                            await message.reply(listMessage);
                            break;
                        }                        case '+status': {
                            let statusMessage = `📊 **Multi-Bot Scanner Durumu**\n\n`;
                            statusMessage += `🤖 **Aktif Bot Sayısı:** ${bots.size}/${config.tokens.length}\n`;
                            statusMessage += `🏠 **Aktif Sunucu Sayısı:** ${serverList.length}\n`;
                            statusMessage += `👥 **Kontrol Edilen Kullanıcı:** ${globalCheckedUsers.size}\n\n`;
                            
                            statusMessage += `⚙️ **Bot Detayları:**\n`;
                            for (const [index, bot] of bots.entries()) {
                                const client = bot.client;
                                const isReady = client.readyAt ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı';
                                const username = client.user?.username || 'Bilinmiyor';
                                const guildCount = client.guilds ? client.guilds.cache.size : 0;
                                statusMessage += `• Bot #${index + 1}: ${isReady} ${username} (${guildCount} sunucu)\n`;
                            }
                            
                            if (failedTokens.size > 0) {
                                statusMessage += `\n❌ **Başarısız Token Sayısı:** ${failedTokens.size}\n`;
                            }
                            
                            await message.reply(statusMessage);
                            break;
                        }

                        case '+servers': {
                            let serversMessage = `🏠 **Bot Sunucu Detayları**\n\n`;
                            
                            for (const [index, bot] of bots.entries()) {
                                const client = bot.client;
                                const username = client.user ? client.user.username : 'Bilinmiyor';
                                const guilds = client.guilds ? Array.from(client.guilds.cache.values()) : [];
                                
                                serversMessage += `🤖 **Bot #${index + 1}: ${username}**\n`;
                                serversMessage += `📊 **Toplam Sunucu:** ${guilds.length}\n\n`;
                                
                                if (guilds.length > 0) {
                                    for (let i = 0; i < Math.min(guilds.length, 10); i++) {
                                        const guild = guilds[i];
                                        const isActive = activeServers.has(guild.id) ? '✅' : '⭕';
                                        serversMessage += `${isActive} **${guild.name}**\n`;
                                        serversMessage += `   └ ID: \`${guild.id}\`\n`;
                                        serversMessage += `   └ Üye: ${guild.memberCount || 'Bilinmiyor'}\n`;
                                        serversMessage += `   └ Aktif Tarama: ${isActive === '✅' ? 'Evet' : 'Hayır'}\n\n`;
                                    }
                                    
                                    if (guilds.length > 10) {
                                        serversMessage += `... ve ${guilds.length - 10} sunucu daha\n\n`;
                                    }
                                } else {
                                    serversMessage += `❌ Bu bot hiçbir sunucuda bulunmuyor\n\n`;
                                }
                                
                                serversMessage += `─────────────────\n\n`;
                            }
                            
                            await message.reply(serversMessage);
                            break;
                        }

                        case '+allservers': {
                            let allServersMessage = `🌍 **Tüm Bot Sunucuları (Detaylı)**\n\n`;
                            const allGuilds = new Map(); // Sunucu ID -> Bot listesi
                            
                            // Tüm botların sunucularını topla
                            for (const [index, bot] of bots.entries()) {
                                const client = bot.client;
                                const username = client.user ? client.user.username : 'Bilinmiyor';
                                const guilds = client.guilds ? Array.from(client.guilds.cache.values()) : [];
                                
                                for (const guild of guilds) {
                                    if (!allGuilds.has(guild.id)) {
                                        allGuilds.set(guild.id, {
                                            guild: guild,
                                            bots: []
                                        });
                                    }
                                    allGuilds.get(guild.id).bots.push({
                                        index: index + 1,
                                        username: username
                                    });
                                }
                            }
                            
                            allServersMessage += `📊 **Toplam Benzersiz Sunucu:** ${allGuilds.size}\n\n`;
                            
                            const sortedGuilds = Array.from(allGuilds.values()).sort((a, b) => b.bots.length - a.bots.length);
                            
                            for (let i = 0; i < Math.min(sortedGuilds.length, 15); i++) {
                                const guildInfo = sortedGuilds[i];
                                const guild = guildInfo.guild;
                                const isActive = activeServers.has(guild.id) ? '✅' : '⭕';
                                
                                allServersMessage += `${isActive} **${guild.name}**\n`;
                                allServersMessage += `   └ ID: \`${guild.id}\`\n`;
                                allServersMessage += `   └ Üye: ${guild.memberCount || 'Bilinmiyor'}\n`;
                                allServersMessage += `   └ Bot Sayısı: ${guildInfo.bots.length}\n`;
                                allServersMessage += `   └ Bot'lar: ${guildInfo.bots.map(b => `#${b.index}`).join(', ')}\n`;
                                allServersMessage += `   └ Aktif Tarama: ${isActive === '✅' ? 'Evet' : 'Hayır'}\n\n`;
                            }
                            
                            if (sortedGuilds.length > 15) {
                                allServersMessage += `... ve ${sortedGuilds.length - 15} sunucu daha\n\n`;
                            }
                            
                            await message.reply(allServersMessage);
                            break;
                        }

                        case '+help': {
                            const helpMessage = `🤖 **Multi-Bot Discord Selfbot - Early Bot Dev + Boost Detector**\n\n` +
                                `📋 **Kullanılabilir Komutlar:**\n\n` +
                                `• \`+add SUNUCU_ID\` - Kontrol edilecek sunucu ekle\n` +
                                `• \`+remove SUNUCU_ID\` - Sunucuyu listeden kaldır\n` +
                                `• \`+list\` - Aktif sunucu listesini göster\n` +
                                `• \`+status\` - Multi-bot sistem durumunu göster\n` +
                                `• \`+servers\` - Her bot'un sunucularını detaylı göster\n` +
                                `• \`+allservers\` - Tüm sunucuları bot sayısıyla göster\n` +
                                `• \`+help\` - Bu yardım menüsünü göster\n\n` +
                                `🔍 **Bot Özellikleri:**\n` +
                                `• ${config.tokens.length} bot ile paralel tarama\n` +
                                `• Early Bot Developer rozeti + 24+ ay boost kontrolü\n` +
                                `• Her bot dakikada maksimum ${config.maxUsersPerCheck} kullanıcı kontrolü\n` +
                                `• Koordineli tarama (aynı kullanıcı birden fazla kontrol edilmez)\n` +
                                `• Hatalı token'lar DM ve webhook ile bildirilir\n` +
                                `• Bulunan kullanıcıları webhook ile log kanalına gönderme\n\n` +
                                `⚙️ **Sistem Ayarları:**\n` +
                                `• Kontrol Aralığı: ${config.checkInterval / 1000} saniye\n` +
                                `• Bot Başlatma Gecikmesi: ${config.multiBot.staggerDelay / 1000} saniye\n` +
                                `• Koordineli Tarama: ${config.multiBot.coordinatedScanning ? 'Aktif' : 'Pasif'}`;

                            await message.reply(helpMessage);
                            break;
                        }

                        default: {
                            if (message.content.startsWith('+')) {
                                await message.reply('❌ Bilinmeyen komut!\n\nYardım için: `+help`');
                            }
                            break;
                        }
                    }
                } catch (error) {
                    console.error('DM komut hatası:', error);
                    await message.reply('❌ Bir hata oluştu! Konsolu kontrol edin.');
                }
            });
        }

        this.client.on('error', (error) => {
            console.error(`[Bot #${this.botIndex + 1}] Client hatası:`, error);
        });
    }

    // Kullanıcı kontrolü - Her bot için ayrı
    async checkUsers() {
        try {
            if (serverList.length === 0) {
                return;
            }

            // Bu bot'un kontrol edeceği sunucuyu belirle
            const currentGuildId = serverList[this.currentServerIndex];
            const guild = this.client.guilds.cache.get(currentGuildId);
            
            if (!guild) {
                // Bu bot'ta sunucu yoksa sıradakine geç
                this.currentServerIndex = (this.currentServerIndex + 1) % serverList.length;
                return;
            }

            console.log(`🔍 [Bot #${this.botIndex + 1}] Kontrol edilen sunucu: ${guild.name} (${guild.id})`);

            // İlk çalıştırmada tüm üyeleri al
            if (this.allUsers.length === 0 || this.currentUserIndex === 0) {
                await guild.members.fetch();
                this.allUsers = Array.from(guild.members.cache.values());
                console.log(`📊 [Bot #${this.botIndex + 1}] ${guild.name} sunucusunda toplam ${this.allUsers.length} üye bulundu.`);
            }

            const usersToCheck = [];
            let checked = 0;

            // Maksimum kontrol sayısına kadar kullanıcı seç
            while (checked < config.maxUsersPerCheck && this.currentUserIndex < this.allUsers.length) {
                const member = this.allUsers[this.currentUserIndex];
                this.currentUserIndex++;

                // Koordineli tarama aktifse global checked users'ı kontrol et
                const shouldCheck = config.multiBot.coordinatedScanning ? 
                    !globalCheckedUsers.has(member.user.id) : 
                    !this.checkedUsers.has(member.user.id);

                if (shouldCheck) {
                    usersToCheck.push(member);
                    checked++;
                }
            }

            // Bu sunucudaki tüm kullanıcılar kontrol edildiyse bir sonraki sunucuya geç
            if (this.currentUserIndex >= this.allUsers.length) {
                this.currentUserIndex = 0;
                this.allUsers = [];
                this.currentServerIndex = (this.currentServerIndex + 1) % serverList.length;
                console.log(`🔄 [Bot #${this.botIndex + 1}] ${guild.name} sunucusu tamamlandı, sıradaki sunucuya geçiliyor...`);
            }

            if (usersToCheck.length > 0) {
                console.log(`🔍 [Bot #${this.botIndex + 1}] ${usersToCheck.length} kullanıcı kontrol ediliyor...`);
            }

            // Seçilen kullanıcıları kontrol et
            for (const member of usersToCheck) {
                const user = member.user;
                
                const hasEarlyBotDev = hasEarlyBotDeveloperBadge(user);
                const hasLongBoost = hasLongTermBoost(member);

                const boostMonths = hasLongBoost ? (() => {
                    const boostStartDate = new Date(member.premiumSince);
                    const now = new Date();
                    return (now.getFullYear() - boostStartDate.getFullYear()) * 12 + 
                           (now.getMonth() - boostStartDate.getMonth());
                })() : 0;

                // Tüm kontrol edilen kullanıcıları nouser.json'a kaydet
                const noUserData = await loadNoUserData();
                noUserData.push({
                    userId: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    hasEarlyBotDeveloper: hasEarlyBotDev,
                    hasLongTermBoost: hasLongBoost,
                    boostMonths: boostMonths,
                    serverId: guild.id,
                    serverName: guild.name,
                    checkedBy: `Bot #${this.botIndex + 1}`,
                    checkedAt: new Date().toISOString()
                });
                await saveNoUserData(noUserData);

                // En az 1 koşulu karşılayanları user.json'a kaydet ve log gönder
                if (hasEarlyBotDev || hasLongBoost) {
                    await sendLogMessage(user, member, boostMonths, guild, hasEarlyBotDev, hasLongBoost, this.botIndex);

                    const userData = await loadUserData();
                    userData.push({
                        userId: user.id,
                        username: user.username,
                        discriminator: user.discriminator,
                        hasEarlyBotDeveloper: hasEarlyBotDev,
                        hasLongTermBoost: hasLongBoost,
                        boostMonths: boostMonths,
                        serverId: guild.id,
                        serverName: guild.name,
                        checkedBy: `Bot #${this.botIndex + 1}`,
                        checkedAt: new Date().toISOString()
                    });
                    await saveUserData(userData);
                }

                // Kontrol edildi olarak işaretle
                this.checkedUsers.add(user.id);
                globalCheckedUsers.add(user.id);
            }

        } catch (error) {
            console.error(`[Bot #${this.botIndex + 1}] Kullanıcı kontrolünde hata:`, error);
        }
    }

    async start() {
        try {
            await this.client.login(this.token);
            console.log(`🚀 [Bot #${this.botIndex + 1}] Başlatılıyor...`);
        } catch (error) {
            console.error(`❌ [Bot #${this.botIndex + 1}] Giriş hatası:`, error);
            failedTokens.add(this.token);
            await notifyFailedToken(this.token, error, this.botIndex);
        }
    }
}

// Ana başlatma fonksiyonu
async function startMultiBot() {
    console.log('🤖 Multi-Bot Discord Selfbot Scanner Başlatılıyor...');
    console.log(`🔢 Toplam Token Sayısı: ${config.tokens.length}`);
    console.log('═'.repeat(50));

    // Mevcut kullanıcı verilerini yükle
    await loadUserData();
    console.log(`📝 ${globalCheckedUsers.size} kullanıcı daha önce kontrol edilmiş.`);

    // Her token için bot oluştur ve başlat
    for (let i = 0; i < config.tokens.length; i++) {
        const token = config.tokens[i];
        if (!token || token.startsWith('//') || token.startsWith('#')) {
            console.log(`⏭️ Token #${i + 1} atlandı (yorum veya boş)`);
            continue;
        }

        const bot = new ScannerBot(token, i);
        bots.set(i, bot);
        
        // Rate limit'i önlemek için botlar arasında gecikme
        setTimeout(async () => {
            await bot.start();
        }, i * config.multiBot.staggerDelay);
    }

    console.log(`🎉 ${bots.size} bot başlatma işlemi tamamlandı!`);
    
    // 10 saniye sonra sistem durumu raporu gönder
    setTimeout(async () => {
        if (ownerClient && ownerClient.readyAt) {
            try {
                const owner = await ownerClient.users.fetch(config.ownerID);
                
                let statusMessage = `📊 **Multi-Bot Sistem Başlatma Raporu**\n\n`;
                statusMessage += `✅ **Başarılı Botlar:** ${successfulBots.size}/${config.tokens.length}\n`;
                statusMessage += `❌ **Başarısız Botlar:** ${failedTokens.size}/${config.tokens.length}\n\n`;
                
                if (successfulBots.size > 0) {
                    statusMessage += `🤖 **Aktif Botlar:**\n`;
                    for (const [index, botInfo] of successfulBots.entries()) {
                        statusMessage += `• Bot #${index + 1}: ${botInfo.username}\n`;
                    }
                    statusMessage += `\n`;
                }
                
                if (failedTokens.size > 0) {
                    statusMessage += `⚠️ **Hatalı Token Sayısı:** ${failedTokens.size}\n`;
                    statusMessage += `Detaylar için webhook mesajlarını kontrol edin.\n\n`;
                }
                
                statusMessage += `🏠 **Aktif Sunucu:** ${serverList.length}\n`;
                statusMessage += `👥 **Kontrol Edilen Kullanıcı:** ${globalCheckedUsers.size}\n`;
                
                await owner.send(statusMessage);
                console.log(`📊 Sistem durumu raporu DM ile gönderildi`);
            } catch (error) {
                console.error('❌ Sistem durumu raporu gönderilemedi:', error.message);
            }
        }
    }, 10000);
}

// Hata yakalama
process.on('unhandledRejection', (error) => {
    console.error('Yakalanmamış hata:', error);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Multi-Bot sistem kapatılıyor...');
    for (const bot of bots.values()) {
        bot.client.destroy();
    }
    process.exit(0);
});

// Multi-bot sistemini başlat
if (config.multiBot && config.multiBot.enabled && config.tokens.length > 0) {
    startMultiBot();
} else {
    console.error('❌ Multi-bot sistemi devre dışı veya token bulunamadı!');
    console.log('config.js dosyasını kontrol edin.');
}
