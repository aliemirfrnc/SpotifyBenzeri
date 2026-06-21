from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from groq import Groq
from pydantic import BaseModel

from backend.core.config import GROQ_API_KEY, FREE_DAILY_LIMIT
from backend.routes.auth import require_user_id

router = APIRouter()

client = Groq(api_key=GROQ_API_KEY)

_rate_limit: dict[int, tuple[date, int]] = {}

SYSTEM_PROMPT = (
    "You are an English language tutor helping users learn English through song lyrics. "
    "Answer concisely in Turkish unless the user writes in English. "
    "Explain vocabulary, grammar, and meaning when asked."
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


def _check_rate_limit(user_id: int) -> None:
    today = date.today()
    last_date, count = _rate_limit.get(user_id, (today, 0))

    if last_date != today:
        _rate_limit[user_id] = (today, 1)
        return

    if count >= FREE_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Günlük mesaj limitine ulaştın.")

    _rate_limit[user_id] = (today, count + 1)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user_id: int = Depends(require_user_id)):
    _check_rate_limit(user_id)

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message},
            ],
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        print("CHAT ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="AI yanıt veremedi.")