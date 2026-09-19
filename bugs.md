# ContextOS Bugs & Audit Log

Bu doküman, ContextOS projesinde tespit edilen kritik hataları, güvenlik/çökme risklerini ve daha önce çözülmüş sorunları içerir.

---

## 🟢 Çözülen ve Doğrulanan Hatalar (Resolved Bugs)

- [x] **1. GeminiProvider Null Pointer / Dereference Çökme Hatası (`TypeError`)**: Optional chaining ve güvenlik kontrolleri eklendi (`candidates?.[0]?.content?.parts?.[0]?.text`).
- [x] **2. LocalProvider & OpenAIProvider Boş Response Çökmesi**: `choices?.[0]?.message` kontrol edilerek anlamlı hata mesajları sağlandı.
- [x] **3. `ContextEngine.ts` Markdown Kod Blokları Kesilme Hatası**: Outer fence ayıklama mantığı güncellendi; iç içe kod blokları ve markdown yapıları korunuyor.
- [x] **4. `CodebaseScanner.ts` Derin Klasör Yapılarında Stack Overflow Riski**: Symlink atlama ve `maxDepth` sınırlandırması eklendi.
- [x] **5. `addMemoryDecision` İçinde LLM Sağlayıcı Tutarsızlığı**: `.ai/config.json` üzerinden aktif LLM konfigürasyon takibi ve `getConfig()` / `saveConfig()` entegrasyonu sağlandı.
- [x] **6. `FileSystemManager.ts` `readContext` `EISDIR` Hatası**: Yalnızca `stats.isFile()` olan öğelerin okunması sağlandı.
- [x] **7. `TaskEngine.ts` `isActionableTask` Aşırı Katı Filtreleme**: Karakter sınırı 500'e yükseltildi, aksiyon kelimeleri Türkçe ve esnek ilk 3 kelime eşleşmesini destekleyecek şekilde genişletildi.
- [x] **Build/Test başarısızlığı**: Yinelenen `clearTasks` tanımı kaldırıldı; `npm run build` ve `npm test` başarıyla geçiyor.
- [x] **Yanlış exit code**: Hata yakalayan CLI komutları artık `process.exitCode = 1` döndürüyor; otomasyona doğru iletiliyor.
- [x] **tasks add / tasks list eksikliği**: `contextos tasks add`, `list` ve `clear` komutları CLI'a eklendi.
- [x] **Kural Doğrulamasında Görev Kaybı**: `validateTaskMarkdown` artık kurallara uymayan yanıt gelse bile ilk adımda üretilen ham görevleri koruyor.
- [x] **`tsconfig.json` moduleResolution hatası**: Kaldırıldı ve build yeşile alındı.
