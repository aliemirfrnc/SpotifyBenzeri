import json
import threading
from datetime import date

from fastapi import APIRouter, HTTPException, Request
from groq import Groq
from pydantic import BaseModel

from backend.core.config import GROQ_API_KEY

router = APIRouter()

client = Groq(api_key=GROQ_API_KEY)

_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()

_rate_limit: dict[str, tuple[date, int]] = {}
DAILY_LIMIT = 100

SYSTEM_PROMPT = (
    "You are a detailed English dictionary assistant for language learners studying through song lyrics. "
    "Given a single English word and the line it appears in (for context only), respond with ONLY a JSON "
    "object with these exact keys:\n"
    "- translation (Turkish, the word's core meaning)\n"
    "- part_of_speech (English, e.g. noun/verb/adjective)\n"
    "- pronunciation (a simple phonetic respelling, not IPA, e.g. 'dreemz')\n"
    "- definition (a short simple English definition, max 14 words)\n"
    "- contextual_meaning (in TURKISH: briefly explain, in 1 short sentence, what this word specifically "
    "conveys or emphasizes in the given line's context — its nuance or emotional tone there — without "
    "repeating the full line verbatim)\n"
    "- register (one of: 'nötr', 'günlük konuşma dili', 'resmi', 'argo', 'şiirsel')\n"
    "- frequency (one of: 'çok yaygın', 'yaygın', 'daha az yaygın')\n"
    "- grammar_note (Turkish, max 16 words: for verbs mention key forms e.g. past tense; for nouns mention "
    "plural form if irregular; for adjectives mention comparative if irregular; empty string if not useful)\n"
    "- synonyms (a list of 2-3 English synonyms, empty list if none fit)\n"
    "- antonyms (a list of 1-2 English antonyms, empty list if none fit)\n"
    "- examples (a list of exactly 2 ORIGINAL English sentences you write yourself that use the word "
    "naturally in different contexts — do NOT copy, quote, or closely paraphrase the line provided, "
    "and do NOT reference songs, lyrics, or music)\n"
    "- usage_note (one short tip in Turkish about common usage or a frequent collocation, max 16 words, "
    "or empty string if nothing notable)\n"
    "No preamble, no markdown, just the JSON object."
)


class WordInfoRequest(BaseModel):
    word: str
    context_line: str = ""


class WordInfoResponse(BaseModel):
    word: str
    translation: str
    part_of_speech: str
    pronunciation: str
    definition: str
    contextual_meaning: str
    register: str
    frequency: str
    grammar_note: str
    synonyms: list[str]
    antonyms: list[str]
    examples: list[str]
    usage_note: str


def _check_rate_limit(ip: str) -> None:
    today = date.today()
    last_date, count = _rate_limit.get(ip, (today, 0))

    if last_date != today:
        _rate_limit[ip] = (today, 1)
        return

    if count >= DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Günlük kelime arama limitine ulaştın.")

    _rate_limit[ip] = (today, count + 1)


def _clean_word(raw: str) -> str:
    return raw.strip(".,!?;:\"'()[]{}…—-").lower()


@router.post("/word-info", response_model=WordInfoResponse)
def word_info(payload: WordInfoRequest, req: Request):
    word = _clean_word(payload.word)
    if not word:
        raise HTTPException(status_code=400, detail="Geçersiz kelime.")

    # Context'e göre cache anahtarı değişiyor çünkü aynı kelime farklı satırlarda
    # farklı bağlamsal anlam çıktısı üretebilir.
    cache_key = f"{word}::{payload.context_line.strip().lower()}"

    with _cache_lock:
        if cache_key in _cache:
            return _cache[cache_key]

    _check_rate_limit(req.client.host)

    user_prompt = f'Word: "{word}"'
    if payload.context_line:
        user_prompt += f'\nLine it appears in (context only, do not reuse verbatim): "{payload.context_line}"'

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=700,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = completion.choices[0].message.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
    except Exception as e:
        print("WORD INFO ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="Kelime bilgisi alınamadı.")

    result = {
        "word": word,
        "translation": data.get("translation", ""),
        "part_of_speech": data.get("part_of_speech", ""),
        "pronunciation": data.get("pronunciation", ""),
        "definition": data.get("definition", ""),
        "contextual_meaning": data.get("contextual_meaning", ""),
        "register": data.get("register", ""),
        "frequency": data.get("frequency", ""),
        "grammar_note": data.get("grammar_note", ""),
        "synonyms": data.get("synonyms") or [],
        "antonyms": data.get("antonyms") or [],
        "examples": data.get("examples") or [],
        "usage_note": data.get("usage_note", ""),
    }

    with _cache_lock:
        _cache[cache_key] = result

    return result