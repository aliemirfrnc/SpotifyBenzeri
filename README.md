<div align="center">
  <img src="https://via.placeholder.com/200x200.png?text=Lingofy+Logo" alt="Lingofy Logo" width="200" height="200" />
  <h1>Lingofy</h1>
  <p><strong>Next-Generation AI Language Learning, powered by the music you already love.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688.svg)](https://fastapi.tiangolo.com/)
  [![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Llama%203-orange.svg)]()
  [![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

  <p align="center">
    <a href="#-the-problem">Problem</a> •
    <a href="#-the-solution">Solution</a> •
    <a href="#-core-features">Features</a> •
    <a href="#-technical-moat">Tech Moat</a> •
    <a href="#-installation">Installation</a>
  </p>
</div>

---

## 🌟 Introduction

**Lingofy** is a revolutionary B2C EdTech platform that sits seamlessly on top of your **Spotify** account. By turning passive music streaming into an active, highly engaging language laboratory, Lingofy solves the biggest problem in EdTech: **User Churn.** 

No more artificial sentences like *"The apple is red"*. Learn metaphors, slang, and emotion through the lyrics of your favorite international artists.

<div align="center">
  <img src="https://via.placeholder.com/800x400.png?text=Product+Demo+GIF+Here" alt="Demo GIF" />
</div>

---

## ❗ The Problem

Traditional language learning apps suffer from a fundamental flaw: **Boredom.**
Users are forced to build a *new* habit around a tedious curriculum. Furthermore, hiring native tutors to practice real pronunciation costs upwards of $30/hour, excluding 95% of the global market from achieving verbal fluency.

## 💡 The Solution

Lingofy piggybacks on an unbreakable habit: **Listening to Music.**
By syncing real-time lyrics, providing instant sub-second AI translations, and offering an interactive **Shadowing Mode**, Lingofy allows users to master languages naturally, affordably, and delightfully.

---

## ✨ Core Features

- **🎵 Spotify Integration:** Play, pause, and sync lyrics directly from your active Spotify Premium session using the Web Playback SDK.
- **🇹🇷 Contextual Translation Pipeline:** Powered by **Groq (Llama-3 70B)**, our engine translates poetic structures and slang flawlessly, completely cached to eliminate latency.
- **🎤 Shadowing Mode:** A karaoke-style full-screen layout designed for intensive speaking practice.
- **🗣️ Pronunciation Coach:** Users record their voice (WebM) and our Whisper AI integration evaluates phonemes, stress, and rhythm to provide a score out of 100.
- **🧠 Spaced Repetition (SRS):** Click any word to instantly view its dictionary definition and save it to your personal learning dashboard.

---

## 🏰 Technical Moat & Architecture

Lingofy is not just a wrapper; it's an intelligent, scalable infrastructure designed to serve millions.

- **High-Speed Inference:** Real-time translation achieved via LPUs (Groq), bringing latency down to <300ms.
- **Enterprise Scalability:** SQLAlchemy ORM ensures seamless PostgreSQL migrations for handling millions of concurrent operations, alongside Redis for distributed caching.
- **Resilient AI Fallback:** Automated degrading from Groq to OpenRouter, and finally to DeepTranslator, guaranteeing the user never sees a blank screen during an API outage.
- **Security First:** Strict HttpOnly JWT cookies and Redis-backed rate limiters defend against XSS and L7 DDoS.

*Dive deep into the backend flow in [ARCHITECTURE.md](ARCHITECTURE.md).*

---

## 🛠️ Tech Stack

**Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, Web Audio API  
**Backend:** Python FastAPI, Uvicorn, SQLAlchemy (PostgreSQL/SQLite), Redis  
**Testing:** Pytest  
**AI Providers:** Groq SDK, OpenRouter, Whisper API  

---

## 🚀 Installation & Local Development

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Spotify Developer Account (Client ID & Secret)

### 2. Environment Variables
Create a `.env` in the project root:
```env
JWT_SECRET=super_secret_key
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Start the Backend
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1
```

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:3000` to start learning.

---

## 📚 Official Documentation

Explore the comprehensive investor and developer documentation:

- 📊 [Investor Overview & Market Fit](INVESTOR_OVERVIEW.md)
- 🎤 [Pitch Deck](PITCH_DECK.md)
- ❓ [Top 100 Investor Q&A](INVESTOR_QNA.md)
- 🏗️ [Architecture & Dependency Flow](ARCHITECTURE.md)
- 🧠 [AI Infrastructure](AI.md)
- 🗄️ [Database Schema & ER Diagrams](DATABASE.md)
- 🔒 [Security Overview](SECURITY.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) to learn about our code style, branching strategy, and pull request rules.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<div align="center">
  <i>"Let's make the world bilingual, one song at a time."</i><br>
  <b>— The Lingofy Team</b>
</div>
