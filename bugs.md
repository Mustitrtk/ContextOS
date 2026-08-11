### Bugs
- [x] When i inputed detail about project, the context file couldn't create well (Fixed with Retry Logic in PollinationsProvider)
- [x] rules.md couldn't created. (Fixed by retry hardening in PollinationsProvider + fallback template write in ContextEngine when provider fails)
        --- Console Output ---
        ---
        npx contextos init
        [dotenv@17.3.1] injecting env (0) from .env -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
        --- ContextOS Initialization ---
        ? Select LLM Provider: Free (Pollinations - No key required)
        LLM Provider: pollinations
        ? How would you like to build the project context? Enter text description
        ? Enter project description: i want to API with nodejs just say hello when i run. Port will be 3000

        Generating context files...
        - Generating architecture.md...
        ✓ architecture.md saved.
        - Generating stack.md...
        ✓ stack.md saved.
        - Generating rules.md...
        ✗ Error generating rules.md: Pollinations (Free API) failed: Request failed with status code 524
        - Generating features.md...
        ✓ features.md saved.

        Context generation complete!
### Bugs
- [x] When i inputed detail about project, the context file couldn't create well (Fixed with Retry Logic in PollinationsProvider)
- [x] rules.md couldn't created. (Fixed by retry hardening in PollinationsProvider + fallback template write in ContextEngine when provider fails)
        --- Console Output ---
        ---
        npx contextos init
        [dotenv@17.3.1] injecting env (0) from .env -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
        --- ContextOS Initialization ---
        ? Select LLM Provider: Free (Pollinations - No key required)
        LLM Provider: pollinations
        ? How would you like to build the project context? Enter text description
        ? Enter project description: i want to API with nodejs just say hello when i run. Port will be 3000

        Generating context files...
        - Generating architecture.md...
        ✓ architecture.md saved.
        - Generating stack.md...
        ✓ stack.md saved.
        - Generating rules.md...
        ✗ Error generating rules.md: Pollinations (Free API) failed: Request failed with status code 524
        - Generating features.md...
        ✓ features.md saved.

        Context generation complete!
        ---
- [x] tsconfig.json dosyasında hata var hata satırı 11: "moduleResolution": "node" (Removed redundant `moduleResolution`; `npm run build` passes)

- [x] .ai/tasks/tasks.md dosyasını da temizleyecek bir komut eklenmeli (`npx contextos tasks clear` added)

### Olası Hatalar ve Test Edilecek Riskler (Potential Bugs & Audit TODOs)
- [ ] **TaskEngine Kural Doğrulamasında Görev Kaybı (Kritik Bug)**:
  - `validateTasksAgainstRules` LLM çağrısı başarısız olduğunda veya LLM onay kutusu (`- [ ]`) formatı dışında genel bir metin döndürdüğünde, `validateTaskMarkdown` ilk adımda başarıyla üretilmiş tüm detaylı görevleri silip genel sabit şablon görevleriyle (`# tasks.md (Fallback)`) değiştirmektedir.
  - *Çözüm Önerisi*: Kural doğrulama çıktısı ayrıştırılamazsa genel fallback'e düşmek yerine ilk adımda üretilen ham görevler korunmalıdır.
- [ ] **`contextos memory add` / `syncFromMemory` Sağlayıcı Uyuşmazlığı**:
  - `index.ts` içindeki `addMemoryDecision` fonksiyonunda `syncFromMemory` çağrılırken varsayılan sağlayıcı olarak `free` seçilmesi, ancak kullanıcının `--llm pro` veya `--llm local` modunda çalışmış olması durumunda tutarsızlık yaşanması.
- [ ] **Codebase Scanner İle Büyük Proje Taramasında Token Taşması (Prompt Overflow)**:
  - `CodebaseScanner` 20 kaynak dosya örneği (toplam ~60KB metin) topladığında, ücretsiz LLM sağlayıcılarında (Pollinations vb.) HTTP 413 (Payload Too Large) veya 524 (Timeout) hataları tetiklenebilmektedir.
  - *Çözüm Önerisi*: Tarama özetine akıllı token sınırlaması ve katmanlı özetleme eklenmelidir.
- [ ] **FileSystemManager `.gitignore` Eşleşme Hataları**:
  - `matchesGitignorePattern` içinde Windows dosya yolları (`\`) ile Linux tarzı (`/`) ayraç uyuşmazlıkları nedeniyle bazı dosyaların gitignore tarafından atlanması riski.
  - Karmaşık glob ifadelerinde (`**/*.log`, `dir/*/*.js`) regex kaçışlarının tam eşleşememesi.
- [ ] **LLM Yanıt Temizleme (`cleanMarkdownOutput`) Hataları**:
  - LLM çıktısında markdown kod bloklarının (` ```markdown `) kapatılmaması veya çıktının başında/sonunda fazladan JSON/metin kalması durumunda içeriğin tamamen silinip boş dönmesi.
- [ ] **TaskEngine Görev Ayrıştırma ve Normalizasyon Hataları**:
  - `ACTION_VERBS` listesinde yer almayan İngilizce/Türkçe aksiyon kelimeleriyle başlayan geçerli görevlerin `isActionableTask` tarafından elenip silinmesi.
- [ ] **İnteraktif CLI `init` Temizleme Akışı Riskleri**:
  - `contextos init` komutunda var olan bağlam dosyaları temizlenmediğinde (`clear: false`), yeni üretilen dosyaların eski içeriklerle çakışması veya kısmi kalıntı bırakması.
