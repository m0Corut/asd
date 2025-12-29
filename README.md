
# CleanUp AI - Akıllı Filigran ve Nesne Silici

CleanUp AI, fotoğraflarınızdaki filigranları, logoları ve istenmeyen nesneleri Gemini yapay zeka modellerini kullanarak profesyonelce temizler. Artık hem ücretsiz hem de ücretli kullanıcılar için optimize edilmiş model seçenekleri sunuyor.

## Model Seçenekleri (Engines)

Uygulama içinde iki farklı yapay zeka motoru arasında seçim yapabilirsiniz:

1.  **Flash (Standard - Gemini 2.5 Flash):**
    *   **Avantajı:** Çok hızlıdır ve genellikle ücretsiz (unpaid) API anahtarlarıyla çalışır.
    *   **Kısıtlama:** 1K çözünürlük desteği sunar. Standart temizlik işleri için idealdir.
2.  **Pro (Ultra - Gemini 3 Pro):**
    *   **Avantajı:** 2K yüksek çözünürlük ve üst düzey doku onarımı sağlar.
    *   **Kısıtlama:** Sadece **Paid Project** (Faturalandırması açık) API anahtarlarıyla çalışır. Ücretsiz anahtarlarda 403 hatası verir.

## 403 Hatası Alıyorsanız Ne Yapmalısınız?

Eğer "Permission Denied" (Erişim Engellendi) veya 403 hatası alıyorsanız:
1.  **Sağ panelden "Flash (Standard)" motorunu seçin.** Bu model ücretsiz anahtarların çoğunda çalışacaktır.
2.  Eğer Pro modelini kullanmak istiyorsanız, Google Cloud projenizde [Faturalandırmayı (Billing)](https://ai.google.dev/gemini-api/docs/billing) etkinleştirmeniz gerekir.

##  Özellikler
- **Toplu İşlem:** Onlarca fotoğrafı aynı anda sürükleyin ve işleyin.
- **Doku Onarımı:** Yapay zeka, silinen alanın arkasını çevreye uygun şekilde "hayal ederek" doldurur.
- **ZIP İndirme:** Tüm temizlenmiş fotoğrafları tek seferde paket halinde indirin.


## 📝 Kullanım İpuçları
- **AI Prompt:** Sadece neyin silinmesini istediğinizi yazın. Örn: "Remove the text in the corner" veya "Delete the logo".
- **Hassaslık:** Musluk, lavabo gibi gerçek objelerin silinmemesi için sistem içinde özel koruma komutları bulunmaktadır.
- 
*Geliştirici Notu: Bu uygulama Google Gemini 2.5 ve 3 serisi modellerin en güncel görüntü işleme yeteneklerini kullanmaktadır.*
