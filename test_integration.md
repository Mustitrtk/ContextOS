# ContextOS Integration & Operational Test Plan

Bu doküman, ContextOS projesinin tüm modüllerini, motorlarını ve CLI arayüzünü test etmek için hazırlanan entegrasyon ve operasyonel test adımlarını içerir.

---

## 1. Birim ve Modül Testleri (Unit & Module Tests)

- [x] **FileSystemManager Testleri**
  - [x] `.ai/`, `.ai/context/`, `.ai/tasks/`, `.ai/memory/` dizinlerinin `ensureStructure()` ile eksiksiz oluşturulmasının doğrulanması.
  - [x] `.ai/context/` altına dosya yazma (`writeContextFile`) ve okuma (`readContext`) fonksiyonlarının doğrulanması.
  - [x] `.ai/tasks/tasks.md` yazma, okuma ve `clearTasks()` fonksiyonunun doğrulanması.
  - [x] `.ai/memory/decisions.md` ve `learnings.md` dosyalarına zaman damgalı veri ekleme (`appendMemory`) ve okuma (`readMemory`) testi.
  - [x] `.gitignore` kalıplarının (`getGitignorePatterns`, `matchesGitignorePattern`, `isGitIgnored`) doğru filtrelendiğinin doğrulanması (`node_modules`, `dist`, `.env` vb. hariç tutma).

- [x] **LLM Abstraction Layer & Factory Testleri**
  - [x] `LLMFactory.create()` ile 'pollinations', 'openai', 'gemini', 'anthropic', 'local' örneklerinin doğru üretilmesinin kontrolü.
  - [x] `LLMUtils.getLLMProvider()` ile `FREE`, `PRO`, `LOCAL` model yönlendirme ve yedekli (fallback) sağlayıcı zincirinin sınanması.
  - [x] Eksik API anahtarında (ör. `OPENAI_API_KEY` yokken `openai` istenmesi) otomatik `pollinations` fallback'inin testi.

- [x] **CodebaseScanner Testleri**
  - [x] Dizin ağacı üretimi (`buildDirectoryTree`) max-depth (4) ve gizli klasör süzgecinin doğrulanması.
  - [x] Proje konfigürasyon dosyalarının (`package.json`, `tsconfig.json`, `README.md`) okunup özetlenmesi.
  - [x] Kaynak kod örneklemesi (`sampleSourceFiles`) ve uzantı filtreleme (ts, js, py, go vb.) kontrolü.

---

## 2. Context Engine Entegrasyon Testleri

- [x] **Metin İle Bağlam Oluşturma (`generateContext`)**
  - [x] Kısa proje metni verildiğinde `architecture.md`, `stack.md`, `rules.md`, `features.md` dosyalarının eksiksiz üretilmesi.
  - [x] Boş veya geçersiz proje açıklamasında hata fırlatma kontrolü.
  - [x] LLM çıktısı bozuk veya yetersiz olduğunda Şablon (Fallback) içeriğin devreye girmesinin sınanması.

- [x] **Kod Tabanı Taraması İle Bağlam Oluşturma (`generateFromCodebase`)**
  - [x] Mevcut projenin veya örnek bir projenin dizin taranarak bağlam dosyalarına dönüştürülmesi.
  - [x] Olmayan bir dizin yolunda uygun hata mesajının üretilmesi.

- [x] **Markdown Dosyası / Klasörü İle Bağlam Oluşturma (`generateFromFolder`)**
  - [x] Klasör içindeki `.md` dosyalarının okunup birleştirilerek bağlam üretilmesi.
  - [x] `.gitignore` kapsamındaki md dosyalarının elenmesi.

- [x] **Hafıza İle Bağlam Senkronizasyonu (`syncFromMemory`)**
  - [x] Karar veya öğrenim eklendikten sonra `architecture.md`, `stack.md` gibi bağlam dosyalarının güncellenmesi.
  - [x] Değişiklik gerekmediğinde dosyanın korunması ([SKIP] durumu).

---

## 3. Task Engine Entegrasyon Testleri

- [x] **İlk Görev Listesi Üretimi (`generateInitialTasks`)**
  - [x] `.ai/context/` dosyaları okunarak `.ai/tasks/tasks.md` dosyasının oluşturulması.
  - [x] Görevlerin Phase başlıkları, onay kutuları (`- [ ]`) ve bağlam referansları (`(ref: architecture.md)`) içerdiğinin kontrolü.
  - [x] Görevlerin `rules.md` kurallarına göre `validateTasksAgainstRules` ile denetlenmesi.
  - [x] Bağlam dosyaları yoksa `init` uyarısı verilerek işlemin durdurulması.

- [x] **Ajan Görev Çalıştırma Döngüsü (`runAgentLoop`)**
  - [x] Sıradaki yapılmamış görevin (`- [ ]`) tespit edilip işlenmesi.
  - [x] Hafızadaki (`decisions.md`, `learnings.md`) ilgili kayıtların sorgulanıp görev bağlamına eklenmesi.
  - [x] Görev tamamlandıktan sonra `tasks.md` içerisinde `[x]` olarak işaretlenmesi.
  - [x] Görev sonucunun `learnings.md` dosyasına başarıyla kaydedilmesi.
  - [x] Tüm görevler bittiğinde "All tasks are completed!" mesajının verilmesi.

---

## 4. Hafıza (Memory) Yonetimi Testleri

- [x] `contextos memory add "Metin"` ile hafızaya karar eklenmesi ve zaman damgasıyla yazılması.
- [x] `contextos /memory "Metin"` kısa yolunun çalıştırılması.
- [x] `contextos memory list` ile eklenen kararların konsola dökülmesi.
- [x] `contextos memory clear` ile hafıza dizininin temizlenmesi.

---

## 5. CLI ve Uçtan Uca (E2E) Testleri

- [x] `npx contextos init --text "Sample App"` komutunun uçtan uca çalıştırılması.
- [x] `npx contextos init --scan .` komutunun uçtan uca çalıştırılması.
- [x] `npx contextos run --llm free` komutu ile görev yürütme testi.
- [x] `npx contextos clear` ile `.ai/context/` temizleme testi.
- [x] `npx contextos tasks clear` ile `.ai/tasks/tasks.md` temizleme testi.
- [x] İnteraktif menü (Inquirer prompts) seçim adımlarının doğrulanması.

---

## 6. Hata Toleransı ve Dayanıklılık (Resilience & Edge Cases) Testleri

- [x] Ağ kesintisi veya LLM API (Pollinations status 524, OpenAI 401/429) hatalarında sistemin çökmeden fallback şablonlarına geçmesi.
- [x] Boş veya bozuk `tasks.md` girdiğinde fallback görev kümesinin üretilmesi.
- [x] Çok büyük dosyalarda token sınırının aşılmaması ve kesme (truncation) mekanizmalarının çalışması.
