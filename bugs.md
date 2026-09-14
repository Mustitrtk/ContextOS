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

# Bugs

## Kritik

- [x] **Build/Test başarısız**: Yinelenen `clearTasks` tanımı kaldırıldı; `npm run build` ve `npm test` geçiyor.
- [x] **Yanlış exit code**: Hata yakalayan CLI komutları artık `process.exitCode = 1` atıyor; `run` ve `test run` başarısızlıkları otomasyona doğru aktarılıyor.
- [x] **tasks add / tasks list uygulanmamış**: `contextos tasks add`, `list` ve `clear` CLI'da uygulanıp README ile hizalandı.

## Diğer bulgular

- [x] **`run --llm local`**: Task üretim hatası artık TaskEngine'den CLI'a iletiliyor ve komut başarısız exit code ile tamamlanıyor.
- [ ] **`dev create-agent --llm local`**: Yerel model erişilemez olduğunda hata veriyor (bekleniyor, ama kontrol edilmeli).
- [ ] **Derleme çıktıları**: Build hatasına rağmen takip edilen `dist/` dosyaları güncel kaynakla yeniden yazılmış durumda; TypeScript kaynak dosyalarına dokunulmamış, sadece derleme çıktıları değişmiş.
- [ ] **İnteraktif init menüsü test edilemedi**: Bu terminalden interaktif menüye cevap verilemediği için manuel seçim akışı tam test edilemedi; `text`, `md` ve `scan` alt akışları doğrudan test edildi ve çalışıyor.

## Çalışan komutlar (referans)

- `init --text`, `init --md`, `init --scan` → LLM yoksa dört context dosyasını fallback içerikle oluşturuyor.
- `clear` → çalışıyor.
- `memory add`, `/memory`, `memory list`, `memory clear` → çalışıyor.
- `doc generate --llm local` → memory yoksa çalışıyor.
- `tasks clear` → çalışıyor.

## Önerilen düzeltme sırası

1. Çift `clearTasks` tanımını çöz (build/test'i yeşile al).
2. Başarısız CLI işlemlerine doğru exit code döndürülmesini sağla (CI/otomasyon için kritik).
3. README ile `tasks` komutlarını hizala (add/list'i uygula veya README'yi güncelle).

### Olası Hatalar ve Test Edilecek Riskler (Potential Bugs & Audit TODOs)
- [x] **TaskEngine Kural Doğrulamasında Görev Kaybı (Kritik Bug)**:
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
