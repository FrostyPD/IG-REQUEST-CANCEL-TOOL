# IG Request Cancel Tool

[![Build](https://img.shields.io/badge/build-electron-blue)]()
[![Platform](https://img.shields.io/badge/platform-windows-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

Instagram'da gönderilmiş fakat henüz kabul edilmemiş **takip isteklerini toplu şekilde iptal etmeye yarayan masaüstü otomasyon uygulaması.**

Bu uygulama Instagram veri export dosyasını okuyarak gönderilmiş takip isteklerini tespit eder ve Playwright kullanarak profillere gidip isteği iptal eder.

---

# Özellikler

- HTML export dosyasından kullanıcıları parse eder
- Playwright ile profillere gidip isteği iptal eder
- Başlat / durdur sistemi
- Başarısızları yeniden deneme
- Seçili başarısızları yeniden deneme
- Canlı profil önizleme
- Log sistemi
- Rapor ekranı
- Ayarlar paneli
- Masaüstü bildirimleri

---

# Nasıl Çalışır

1. Instagram hesap verisi export edilir
2. Export içindeki **sent follow requests HTML** dosyası okunur
3. Kullanıcı listesi çıkarılır
4. Playwright ile profil sayfaları ziyaret edilir
5. Gönderilmiş takip isteği iptal edilir

---

# Kurulum

Projeyi çalıştırmak için:

```bash
npm install
npx playwright install chromium
npm start
```

---

# Build Alma

Windows için `.exe` dosyası oluşturmak:

```bash
npm run build
```

Build sonrası dosya:

```
dist/IG-Request-Cancel-Tool.exe
```

---

## İndirme

Hazır sürümü indirmek için repo sayfasındaki **Releases** bölümüne girip son yayınlanan sürümü indirebilirsiniz.

[![Windows Sürümünü İndir](https://img.shields.io/badge/Windows-Sürümünü%20İndir-2ea44f?style=for-the-badge)](../../releases)

# Ekran Görüntüleri

## 📸 Uygulama Arayüzü

![Dashboard](docs/dashboard.png)

---

# Demo

![Demo](docs/demo.gif)

---

# Proje Yapısı

```
main.js
preload.js

renderer/
  index.html
  app.js
  style.css

src/
  worker.js
  parser.js
  state.js
```

---

# Güvenlik

Bu uygulama:

- Instagram API kullanmaz
- Hesap bilgilerini kaydetmez
- Yerel otomasyon kullanır

Login işlemi **Playwright tarayıcısı üzerinden yapılır.**

---

# Yasal Uyarı

Bu proje **Instagram / Meta ile bağlantılı değildir.**

Bu araç yalnızca eğitim ve kişisel kullanım amacıyla geliştirilmiştir.

---

# Lisans

MIT License
