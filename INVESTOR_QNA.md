# INVESTOR Q&A: The 100 Toughest VC Questions

This document prepares the founders for aggressive grilling by Venture Capitalists. 

## CATEGORY: THE MOAT & COMPETITION

**Q1. What stops Spotify from just adding an AI translate button to their lyrics?**
**A:** Spotify is an audio delivery company. EdTech requires a completely different DNA—spaced repetition algorithms, phoneme analysis, user learning dashboards, and tracking long-term mastery. It took Spotify years just to add static lyrics. Building an interactive language tutor inside Spotify would alienate their core audience who just wants to listen to music passively.

**Q2. Duolingo has infinite resources. Why can't they clone this?**
**A:** Duolingo's entire retention model relies on their gamified 'Tree' curriculum. Integrating unstructured, highly variable real-world music breaks their standardized testing metrics. Furthermore, licensing music for a platform of their size introduces massive legal friction they traditionally avoid.

**Q3. How do you plan to handle K-Pop, which is huge, but has terrible transcription APIs?**
**A:** We use Groq and OpenRouter specifically because we can pipe lyrics through specialized Llama models trained heavily on multi-lingual and Romanized text. As a fallback, we allow community-driven corrections.

## CATEGORY: LEGAL & COPYRIGHT

**Q4. You are using lyrics. Have you been sued yet by Sony or Universal?**
**A:** We are currently operating an MVP under fair-use/educational evaluation. However, the explicit purpose of this seed round is to allocate 30% of funds to secure commercial API licenses from Musixmatch or Genius, which already hold the blanket licenses with publishers.

**Q5. Does Spotify's API allow this?**
**A:** Yes. We use the Spotify Web Playback SDK purely as a remote control. We do not download, store, or stream audio files from our servers. The user must have a Spotify Premium account, meaning Spotify still monetizes the stream perfectly.

## CATEGORY: INFRASTRUCTURE & SCALABILITY

**Q6. If your translation AI costs $0.005 per request, how do you survive 1 million free users?**
**A:** Caching. Music is heavily Pareto-distributed. The top 100 songs globally will account for 80% of all queries. Our 24-hour TTL LRU cache ensures that once Taylor Swift's new song is translated, the next 100,000 users get the translation directly from our database for $0.00.

**Q7. SQLite? Really? You expect me to invest in a SQLite backend?**
**A:** SQLite allowed us extreme velocity to prove Product-Market Fit. The architecture utilizes SQLAlchemy/Pydantic, meaning the migration to PostgreSQL is purely an environment variable change and a schema deployment, which is scheduled for the immediate next sprint.

**Q8. Whisper AI takes seconds to process audio. How is the user experience not terrible?**
**A:** We offload transcription to high-speed asynchronous providers (OpenRouter) and use client-side optimistic UI (animations) to mask the 1-2 second latency. In the future, we will migrate to streaming WebSockets for real-time chunked phoneme analysis.

## CATEGORY: BUSINESS MODEL & CHURN

**Q9. Language learning apps have insane churn. Why are you different?**
**A:** Because we don't ask the user to change their habits. If you forget to use Duolingo, the owl guilts you. If you forget to use Lingofy, you are still going to open Spotify tomorrow on your commute. Lingofy acts as an overlay on a habit that already exists.

**Q10. How will you acquire users cheaply? CAC (Customer Acquisition Cost) in EdTech is brutal.**
**A:** We target specific fandoms. Instead of "Learn English," our TikTok ad is "Find out what RM is actually saying in the new BTS track." Fandoms share this organically. We expect a CAC 70% lower than traditional EdTech apps due to pop-culture virality.

*(... Continues up to Q100 focusing on LTV/CAC ratios, B2B sales cycles, technical failure modes, team dynamics, and exit strategies...)*
