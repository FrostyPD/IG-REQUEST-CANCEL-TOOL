# IG-REQUEST-CANCEL-TOOL
Instagram takip isteklerini otomatik ve güvenli bir şekilde silmenize yarayan otomasyon uygulaması.
## Demo

> `docs/demo.gif` dosyasını eklediğinde aşağıdaki görsel otomatik görünecek.

<img src="docs/demo.gif" width="900" alt="Uygulama demo görüntüsü">

### Demo GIF nasıl hazırlanır?

Windows'ta en temiz yöntemlerden biri:

- ScreenToGif ile uygulamayı kaydet
- 8–15 saniyelik kısa bir akış hazırla
- Şu akışı göster:
  1. HTML seçme
  2. Instagram login açma
  3. Başlatma
  4. Canlı profil önizleme
  5. Log akışı
  6. Rapor ekranı
- Çıktıyı `docs/demo.gif` olarak kaydet

Öneri:
- 1280px genişlik yeterli
- 10–12 FPS yeterli
- 10 MB altı tutmaya çalış
- Blur / sansür gerekiyorsa kullanıcı adlarını gizle

## Release İndirme

En güncel `.exe` sürümünü buradan indirebilirsin:

[En son sürümü indir](../../releases/latest)

## Sürüm Yayınlama

Bu repo, GitHub tag atıldığında otomatik olarak Windows release oluşturacak şekilde ayarlanmıştır.

### Release alma mantığı

Aşağıdaki komutlarla yeni sürüm yayınlanır:

```bash
npm version patch
git push
git push --tags
```

Örnek tag:

```bash
v1.0.0
```

Tag GitHub'a gittiğinde workflow şunları yapar:

- bağımlılıkları kurar
- uygulamayı build eder
- `dist/` çıktısını toplar
- GitHub Release oluşturur
- `.exe` dosyasını releas'e ekler
