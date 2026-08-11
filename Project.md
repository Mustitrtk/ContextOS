# AgentORCH - Multi-Agent Orchestration Platform (MVP)

## Proje Tanimi

AgentORCH, birden fazla AI agent'in birlikte calisarak gorevleri arastirdigi, uyguladigi ve denetledigi bir orchestration sistemidir.

Bu MVP surumunde sistem:

> "AI destekli kucuk bir ekip (Researcher + Developer + Supervisor)"

gibi calisir.

## Amac

- Gorevleri akilli sekilde islemek
- Agent'lar arasinda is bolumu yapmak
- Ciktiyi kontrol ederek kaliteyi artirmak
- Basit ama guclu bir orchestration sistemi kurmak

## Sistem Mimarisi (MVP)

```text
User Input
  ->
Researcher Agent
  ->
Developer Agent
  ->
Supervisor Agent
  ->
Final Output
```

## Agent Rolleri

### 1. Researcher Agent

Sorumluluklar:

- Task'i analiz eder
- Gerekli teknik bilgileri ve best practice'leri arastirir
- Developer icin context uretir

Ornek:

> "Build login system" -> authentication yontemleri ve guvenlik onerileri

### 2. Developer Agent

Sorumluluklar:

- Researcher ciktisini kullanarak kod uretir
- Temiz, moduler ve calisabilir kod yazar

### 3. Supervisor Agent

Sorumluluklar:

- Developer ciktisini kontrol eder
- Hata, eksik veya mantik problemi bulur
- Gerekirse Developer'a geri gonderir

## Execution Flow

1. User task girer.
2. Researcher analiz eder.
3. Developer kod uretir.
4. Supervisor kontrol eder.

Eger hata varsa:

- Developer'a geri gonderilir

Eger basariliysa:

- Final output olusturulur

## Core Engine

Sorumluluklar:

- Task yonetimi
- Agent orchestration
- Agent'lar arasinda veri akisi
- Feedback loop yonetimi
- Basit retry mekanizmasi

## Ornek Kullanim

```bash
agentorch run "build login system"
```

## Memory Sistemi

```json
{
  "task": "build login system",
  "research": "...",
  "code": "...",
  "review": "...",
  "status": "completed"
}
```
