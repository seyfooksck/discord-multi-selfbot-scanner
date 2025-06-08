# Multi-Bot Discord Selfbot Scanner v2.0 🤖

Discord sunucularında **Early Bot Developer** rozeti ve **24+ ay boost** süresine sahip kullanıcıları paralel botlarla tarayan gelişmiş selfbot sistemi. Çoklu token desteği, hata yönetimi ve otomatik raporlama özellikleri ile donatılmış profesyonel tarama sistemi.

## 🌟 Özellikler

### 🔥 Multi-Bot Sistemi
- **Birden fazla Discord hesabı** ile aynı anda tarama
- **Koordineli tarama** - Aynı kullanıcı birden fazla bot tarafından kontrol edilmez
- **Rate limit koruması** - Botlar arası gecikme sistemi
- **Paralel işlem** - Her bot farklı sunucularda/kullanıcılarda çalışır
- **Hata yönetimi** - Başarısız token'lar DM ve webhook ile bildirilir
- **Otomatik raporlama** - Sistem durumu DM ile otomatik raporlanır

### 🎯 Akıllı Tarama
- Early Bot Developer rozeti kontrolü
- 24+ ay boost süresi kontrolü
- Daha önce kontrol edilen kullanıcıları atlama
- Sunucu bazlı kullanıcı yönetimi

### 📊 Veri Yönetimi
- **user.json** - Koşulları karşılayan kullanıcılar
- **nouser.json** - Tüm kontrol edilen kullanıcılar
- **servers.json** - Aktif sunucu listesi
- Webhook ile gerçek zamanlı log sistemi

### 💬 DM Komut Sistemi
- `+add SUNUCU_ID` - Sunucu ekle
- `+remove SUNUCU_ID` - Sunucu kaldır
- `+list` - Sunucu listesi
- `+status` - Multi-bot durum kontrolü
- `+servers` - Her bot'un sunucularını detaylı göster
- `+allservers` - Tüm sunucuları bot sayısıyla göster
- `+help` - Yardım menüsü

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Config Dosyasını Düzenle

`config.js` dosyasında token'larınızı ekleyin:

```javascript
module.exports = {
    // Birden fazla token ekleyin
    tokens: [
        "İLK_TOKEN_BURAYA",
        "İKİNCİ_TOKEN_BURAYA",
        "ÜÇÜNCÜ_TOKEN_BURAYA",
        // Daha fazla token ekleyebilirsiniz
    ],
    ownerID: "OWNER_DISCORD_ID",
    logChannelId: "LOG_CHANNEL_ID",
    checkInterval: 6000, // 6 saniye
    maxUsersPerCheck: 50, // Her bot için
    Webhook: "WEBHOOK_URL",
    
    multiBot: {
        enabled: true,
        staggerDelay: 2000, // Bot başlatma gecikmeleri (ms)
        sharedServerList: true,
        coordinatedScanning: true // Koordineli tarama
    }
};
```

### 3. Botları Başlat

**Multi-Bot sistemi için:**
```bash
npm run multi
```

**Tek bot sistemi için:**
```bash
npm start
```

## ⚙️ Yapılandırma

### Multi-Bot Ayarları

| Ayar | Açıklama | Varsayılan |
|------|----------|------------|
| `tokens` | Bot token'ları dizisi | [] |
| `staggerDelay` | Bot başlatma gecikmeleri (ms) | 2000 |
| `coordinatedScanning` | Koordineli tarama aktif/pasif | true |
| `sharedServerList` | Ortak sunucu listesi | true |

### Tarama Ayarları

| Ayar | Açıklama | Varsayılan |
|------|----------|------------|
| `checkInterval` | Kontrol aralığı (ms) | 6000 |
| `maxUsersPerCheck` | Bot başına maks kullanıcı | 50 |

## 🎮 Kullanım

### Botları Başlatma
1. Config dosyasına token'larınızı ekleyin
2. `npm run multi` komutu ile başlatın
3. Her bot farklı hesapla giriş yapacak

### Sunucu Ekleme
Herhangi bir bot hesabına DM atın:
```
+add 123456789012345678
```

### Durum Kontrolü
```
+status
```
Bu komut size şu bilgileri verir:
- Aktif bot sayısı
- Her bot'un durumu (çevrimiçi/çevrimdışı)
- Kontrol edilen kullanıcı sayısı
- Aktif sunucu sayısı
- Başarısız token sayısı

### Sunucu Detayları
Her bot'un hangi sunucularda olduğunu görmek için:
```
+servers
```

Tüm sunucuların hangi bot'larda olduğunu görmek için:
```
+allservers
```

### Sonuçları Görüntüleme
- **Webhook**: Belirlediğiniz Discord kanalına embed mesajlar
- **user.json**: Koşulları karşılayan kullanıcılar
- **nouser.json**: Tüm kontrol edilen kullanıcılar
  
### Webhook Detay
![alt text](https://github.com/[username]/[reponame]/blob/[branch]/image.jpg?raw=true)
https://github.com/seyfooksck/discord-multi-selfbot-scanner/blob/main/user.png?raw=true
## 📈 Performans

### Multi-Bot Avantajları
- **Hız**: N bot = N kat hızlı tarama
- **Güvenilirlik**: Bir bot düşerse diğerleri çalışmaya devam eder
- **Rate limit dağılımı**: Her bot kendi rate limit'ine sahip
- **Paralel sunucu tarama**: Farklı sunucular aynı anda taranır

### Örnek Performans
- 1 Bot: 50 kullanıcı/dakika
- 3 Bot: 150 kullanıcı/dakika
- 5 Bot: 250 kullanıcı/dakika

## 🛡️ Güvenlik

### Rate Limit Koruması
- Bot başlatma gecikmeleri
- Webhook rate limit kontrolü
- API isteği gecikmeleri

### Veri Koruması
- Local JSON dosyalar
- Koordineli kontrol (duplikasyon önleme)
- Hata yakalama ve log sistemi

## 🚨 Hata Yönetimi

### Token Hata Bildirimleri
- **DM Bildirimi**: Başarısız token'lar öncelikle DM ile bildirilir
- **Webhook Yedek**: DM gönderilemezse webhook ile bildirim yapılır
- **Token Maskeleme**: Token'lar güvenlik için maskelenerek gösterilir
- **Detaylı Hata**: Hata nedeni ve öneriler ile birlikte bildirilir

### Otomatik Sistem Raporu
Bot başlatıldıktan 10 saniye sonra otomatik olarak DM ile şu bilgiler gönderilir:
- Başarılı/başarısız bot sayıları
- Her bot'un durumu
- Aktif sunucu ve kullanıcı istatistikleri

## 🔧 Sorun Giderme

### Bot Giriş Yapamıyor
- Token'ın doğru olduğundan emin olun
- Self-bot token kullandığınızdan emin olun
- Rate limit'e takılmış olabilirsiniz
- Hatalı token'lar otomatik olarak DM ile bildirilir
- Config dosyasında token formatını kontrol edin

### Webhook Çalışmıyor
- Webhook URL'sinin doğru olduğundan emin olun
- Webhook permission'larını kontrol edin
- Rate limit kontrolü yapın
- Webhook name "Badge Scanner" olarak ayarlanmalı

### Token Hataları
- Geçersiz token'lar otomatik tespit edilir
- DM bildirimleri gelmiyorsa webhook'u kontrol edin
- Token maskeleme ile güvenlik sağlanır
- Sistem raporu 10 saniye sonra otomatik gelir

## 📋 Komut Referansı

### Sunucu Yönetimi
| Komut | Açıklama | Örnek Kullanım |
|-------|----------|----------------|
| `+add SUNUCU_ID` | Sunucu ekle | `+add 123456789012345678` |
| `+remove SUNUCU_ID` | Sunucu kaldır | `+remove 123456789012345678` |
| `+list` | Aktif sunucu listesi | `+list` |

### Durum ve İzleme
| Komut | Açıklama | Gösterilen Bilgiler |
|-------|----------|-------------------|
| `+status` | Sistem durumu | Bot sayısı, sunucu sayısı, kullanıcı sayısı |
| `+servers` | Bot sunucu detayları | Her bot'un hangi sunucularda olduğu |
| `+allservers` | Tüm sunucular | Hangi sunucunun hangi bot'larda olduğu |

### Yardım
| Komut | Açıklama |
|-------|----------|
| `+help` | Tüm komutlar ve sistem bilgileri |

## 📊 Çıktı Formatları

### +status Komutu Çıktısı
```
📊 Multi-Bot Scanner Durumu

🤖 Aktif Bot Sayısı: 3/5
🏠 Aktif Sunucu Sayısı: 12
👥 Kontrol Edilen Kullanıcı: 1,247

⚙️ Bot Detayları:
• Bot #1: 🟢 Çevrimiçi TestUser1 (8 sunucu)
• Bot #2: 🟢 Çevrimiçi TestUser2 (6 sunucu)
• Bot #3: 🔴 Çevrimdışı Bilinmiyor (0 sunucu)

❌ Başarısız Token Sayısı: 2
```

### +servers Komutu Çıktısı
```
🏠 Bot Sunucu Detayları

🤖 Bot #1: TestUser1
📊 Toplam Sunucu: 8

✅ Test Server 1
   └ ID: 123456789012345678
   └ Üye: 1,234
   └ Aktif Tarama: Evet

⭕ Test Server 2
   └ ID: 987654321098765432
   └ Üye: 567
   └ Aktif Tarama: Hayır
```

### Webhook Log Formatı
- **Başlık**: 🎯 Kullanıcı Kontrol Sonucu
- **Renk Kodları**:
  - 🔵 Mavi: Her iki koşul (rozet + boost)
  - 🟠 Turuncu: Tek koşul
  - 🔴 Kırmızı: Token hatası
- **Alan Bilgileri**: Kullanıcı, sunucu, bot, rozet/boost durumu

### Yavaş Tarama
- `maxUsersPerCheck` değerini artırın
- `checkInterval` değerini azaltın
- Daha fazla bot ekleyin

## 📝 Log Sistemi

### Konsol Logları
```
🤖 [Bot #1] User123 olarak giriş yapıldı!
👑 [Bot #1] Owner client olarak atandı: User123
🔍 [Bot #2] Kontrol edilen sunucu: Test Server
✅ [Bot #1] Webhook log gönderildi: TestUser#1234
❌ [Bot #3] TOKEN HATASI: MTg5NjI4MzQ3...
📊 Sistem durumu raporu DM ile gönderildi
```

### Webhook Logları
- Kullanıcı bilgileri (ID, username, avatar)
- Rozet/boost durumu (✅/❌ görsel göstergeler)
- Sunucu bilgileri (isim, ID, üye sayısı)
- Hangi bot tarafından bulunduğu
- Token hata bildirimleri (maskelenmiş token ile)
- Sistem durumu bildirimleri

## ⚠️ Önemli Notlar

1. **Discord ToS**: Selfbot kullanımı Discord ToS'u ihlal edebilir
2. **Rate Limits**: Çok agresif tarama yapmayın
3. **Token Güvenliği**: Token'larınızı güvenli tutun - sistem otomatik maskeleme yapar
4. **Backup**: Düzenli olarak JSON dosyalarını yedekleyin
5. **Hata Bildirimleri**: Sistem hataları otomatik olarak DM ve webhook ile bildirilir
6. **Owner Client**: İlk başarılı bot DM komutları için kullanılır

## 🆕 Yeni Özellikler (v2.0)

### ✅ Yeni Eklenenler
- **Çoklu token desteği** - Sınırsız bot sayısı
- **Hata yönetim sistemi** - Otomatik token hata bildirimi
- **Yeni DM komutları** - `+servers`, `+allservers`
- **Sistem durumu raporu** - Otomatik başlatma raporu
- **Token maskeleme** - Güvenlik için token gizleme
- **Koordineli tarama** - Duplikasyon önleme
- **Rate limit koruması** - Bot arası gecikme sistemi

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun
3. Commit'lerinizi yapın
4. Pull request gönderin

## 📄 Lisans

Bu proje MIT lisansı altında yayınlanmıştır.

---

**⚡ Multi-Bot Discord Selfbot Scanner - Hızlı, Güvenilir, Akıllı**
