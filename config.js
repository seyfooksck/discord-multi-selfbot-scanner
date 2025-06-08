module.exports = {
    tokens: [
        ""
    ],
    ownerID: "", // Botun sahibinin Discord ID'si
    logChannelId: "", // Log kanalı ID'si
    checkInterval: 6000, // Her bot için kontrol aralığı (milisaniye)
    maxUsersPerCheck: 50, // Her bot için dakikada maksimum kontrol edilecek kullanıcı sayısı
    Webhook:"",
    
    // Multi-bot ayarları
    multiBot: {
        enabled: true, // Çoklu bot sistemini aktif/pasif yapmak için
        staggerDelay: 2000, // Bot başlatma gecikmeleri (milisaniye) - Rate limit'i önlemek için
        sharedServerList: true, // Tüm botlar aynı sunucu listesini kullanır mı?
        coordinatedScanning: true // Botlar koordineli tarama yapar mı? (aynı kullanıcıyı birden fazla bot kontrol etmez)
    }
};