# ContextOS Bugs & Audit Log

Bu doküman, ContextOS projesinde tespit edilen kritik hataları, güvenlik/çökme risklerini ve daha önce çözülmüş sorunları içerir. Geliştirici ekibinin bu sırayla düzenlemesi önerilir.

---

## 🔴 Aktif ve Tespit Edilen Kritik Hatalar (Active Bugs to Fix)

- [ ] **1. GeminiProvider Null Pointer / Dereference Çökme Hatası (`TypeError`)**
  - **Konum**: [src/core/GeminiProvider.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/core/GeminiProvider.ts#L42)
  - **Detay**: Gemini API güvenlik filtresi (SAFETY/RECITATION) veya engelleme nedeniyle `candidates` yanıtı boş döndüğünde, `response.data.candidates[0].content.parts[0].text` erişimi `TypeError: Cannot read properties of undefined (reading 'parts')` ile uygulamayı çökertecektir.
  - **Çözüm**: Optional chaining (`candidates?.[0]?.content?.parts?.[0]?.text`) ve güvenli hata kontrolü eklenmeli.

- [ ] **2. LocalProvider & OpenAIProvider Boş Response Çökmesi**
  - **Konum**: [src/core/LocalProvider.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/core/LocalProvider.ts#L41) ve [src/core/OpenAIProvider.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/core/OpenAIProvider.ts#L39)
  - **Detay**: Yerel modeller (Ollama/LM Studio) veya OpenAI boş `choices` dizisi döndürdüğünde `choices[0].message` erişimi unhandled `TypeError` oluşturur.
  - **Çözüm**: `response.data?.choices?.[0]` kontrol edilip anlamlı hata fırlatılmalı.

- [ ] **3. `ContextEngine.ts` Markdown Kod Blokları Kesilme (Truncation) Hatası**
  - **Konum**: [src/engines/ContextEngine.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/engines/ContextEngine.ts#L211)
  - **Detay**: `cleanMarkdownOutput` içinde kullanılan `^```(?:markdown|md)?\s*([\s\S]*?)```$` regex'i, üretilen markdown dökümanının içinde iç içe kod blokları (örneğin ```ts ... ```) bulunduğunda dokümanı ilk iç kod bloğunun kapanışında kesmektedir.
  - **Çözüm**: Kod çiti temizleme mantığı en dış çitleri (outer fences) hedefleyecek şekilde güncellenmeli.

- [ ] **4. `CodebaseScanner.ts` Derin Klasör Yapılarında Sonsuz Özyineleme (Stack Overflow) Riski**
  - **Konum**: [src/utils/CodebaseScanner.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/utils/CodebaseScanner.ts#L162)
  - **Detay**: `collectSourceFiles` fonksiyonu özyinelemeli (recursive) çalışırken `maxDepth` kontrolü yapmamaktadır. Sembolik bağlar (symlinks) veya çok derin klasör yapılarında maksimum çağrı yığını aşılarak uygulama çökmektedir.
  - **Çözüm**: `collectSourceFiles` içine derinlik limiti ve symlink kontrolü eklenmeli.

- [ ] **5. `addMemoryDecision` İçinde LLM Sağlayıcı Tutarsızlığı**
  - **Konum**: [index.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/index.ts#L31)
  - **Detay**: Hafızaya karar eklendiğinde (`contextos memory add`) çağrılan `addMemoryDecision` varsayılan olarak `free` sağlayıcısını seçer. Kullanıcı projesini `--llm pro` veya `--llm local` ile başlatmışsa hafıza senkronizasyonu yanlış model ile yapılır.
  - **Çözüm**: Aktif LLM seçimi kaydedilmeli veya `.ai/config.json` üzerinden okunmalı.

- [ ] **6. `FileSystemManager.ts` `readContext` Dizinde Klasör Varsa Hata Fırlatması (`EISDIR`)**
  - **Konum**: [src/core/FileSystemManager.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/core/FileSystemManager.ts#L100)
  - **Detay**: `.ai/context/` klasörü içerisine bir alt klasör oluşturulursa `readContext()` içindeki `fs.readFile` `EISDIR` (Is a directory) hatası vererek çalışmayı durdurur.
  - **Çözüm**: Yalnızca `stats.isFile()` durumundaki dosyalar okunmalıdır.

- [ ] **7. `TaskEngine.ts` `isActionableTask` Aşırı Katı Filtreleme (Görev Silinmesi)**
  - **Konum**: [src/engines/TaskEngine.ts](file:///c:/Users/pc/Desktop/Projeler/ContextOS/ContextOS/src/engines/TaskEngine.ts#L488)
  - **Detay**: Görev uzunluğu 180 karakterden büyük olan detaylı teknik görevler veya `ACTION_VERBS` listesinde bulunmayan geçerli aksiyon kalıpları normalizasyon aşamasında elenip silinmektedir.
  - **Çözüm**: Karakter sınırı esnetilmeli ve aksiyon kelimeleri esnek hale getirilmelidir.

---

## 🟢 Çözülen ve Doğrulanan Hatalar (Resolved Bugs)

- [x] **Build/Test başarısızlığı**: Yinelenen `clearTasks` tanımı kaldırıldı; `npm run build` ve `npm test` başarıyla geçiyor (35/35 test yeşil).
- [x] **Yanlış exit code**: Hata yakalayan CLI komutları artık `process.exitCode = 1` döndürüyor; otomasyona doğru iletiliyor.
- [x] **tasks add / tasks list eksikliği**: `contextos tasks add`, `list` ve `clear` komutları CLI'a eklendi.
- [x] **Kural Doğrulamasında Görev Kaybı**: `validateTaskMarkdown` artık kurallara uymayan yanıt gelse bile ilk adımda üretilen ham görevleri koruyor.
- [x] **`tsconfig.json` moduleResolution hatası**: Kaldırıldı ve build yeşile alındı.
