![Banner](docs/banner.png)

<p align="center">
  <img src="docs/logo.png" width="120" alt="IG Request Cancel Tool Logo">
</p>

# IG Request Cancel Tool

[![Release](https://img.shields.io/github/v/release/FrostyPD/IG-REQUEST-CANCEL-TOOL)](https://github.com/FrostyPD/IG-REQUEST-CANCEL-TOOL/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Windows](https://img.shields.io/badge/platform-Windows-blue)]()
[![Stars](https://img.shields.io/github/stars/FrostyPD/IG-REQUEST-CANCEL-TOOL?style=social)](https://github.com/FrostyPD/IG-REQUEST-CANCEL-TOOL/stargazers)
[![Downloads](https://img.shields.io/github/downloads/FrostyPD/IG-REQUEST-CANCEL-TOOL/total)](https://github.com/FrostyPD/IG-REQUEST-CANCEL-TOOL/releases)

Instagram takip isteklerini otomatik ve güvenli bir şekilde silmenize yarayan masaüstü uygulaması.

---

## ⬇️ İndir

Windows için hazır EXE dosyasını indirmek için:

[![Download](https://img.shields.io/badge/Download-Windows%20EXE-blue?style=for-the-badge&logo=windows)](https://github.com/FrostyPD/IG-REQUEST-CANCEL-TOOL/releases)

---

## 🎬 Demo

![Demo](docs/demo.gif)

---

## 📸 Uygulama Arayüzü

![Dashboard](docs/dashboard.png)

---

## Özellikler

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

## Nasıl Çalışır

1. Instagram hesap verisi export edilir
2. Export içindeki takip isteği HTML dosyası okunur
3. Kullanıcı listesi çıkarılır
4. Playwright ile profil sayfaları ziyaret edilir
5. Bekleyen takip isteği iptal edilir

---

## Kurulum (Geliştiriciler için)

Projeyi çalıştırmak için:

```bash
npm install
npx playwright install chromium
npm start
```
## Build Alma

Uygulamanın portable EXE dosyasını oluşturmak için:

npm run build

Oluşan dosya dist/ klasörünün içinde olacaktır.

## İndirme

Hazır .exe dosyasını indirmek için:

Releases sayfasına git

En son sürümü aç

.exe veya .rar dosyasını indir

Release sayfası:
https://github.com/FrostyPD/IG-REQUEST-CANCEL-TOOL/releases

## Yasal Uyarı

Bu proje Instagram / Meta ile bağlantılı değildir.

Sadece kullanıcıların kendi hesaplarındaki bekleyen takip isteklerini yönetmelerine yardımcı olmak için geliştirilmiştir.

Kullanım tamamen kullanıcının sorumluluğundadır.

## Lisans

MIT License
