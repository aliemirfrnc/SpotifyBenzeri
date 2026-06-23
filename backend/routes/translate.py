import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from deep_translator import GoogleTranslator
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.cache_store import load, save
from backend.routes.auth import require_user_id

router = APIRouter()

_cache: dict[str, str] = load("translations")
_cache_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=5)

_rate_limit: dict[int, tuple[date, int]] = {}
_rate_limit_lock = threading.Lock()
DAILY_LIMIT = 500


class TranslateRequest(BaseModel):
    text: str


class TranslateResponse(BaseModel):
    translation: str


class TranslateBatchRequest(BaseModel):
    lines: list[str]


class TranslateBatchResponse(BaseModel):
    translations: dict[str, str]
    failed: list[str]


def _check_rate_limit(user_id: int, cost: int = 1) -> None:
    with _rate_limit_lock:
        today = date.today()
        last_date, count = _rate_limit.get(user_id, (today, 0))

        if last_date != today:
            count = 0

        if count + cost > DAILY_LIMIT:
            raise HTTPException(status_code=429, detail="Günlük çeviri limitine ulaştın.")

        _rate_limit[user_id] = (today, count + cost)


def _translate_cached(text: str) -> tuple[str | None, bool]:
    key = text.strip()
    if not key:
        return "", False

    with _cache_lock:
        if key in _cache:
            return _cache[key], False

    try:
        result = GoogleTranslator(source="auto", target="tr").translate(key)
    except Exception as e:
        print("TRANSLATE ERROR:", repr(e))
        return None, False

    with _cache_lock:
        _cache[key] = result

    return result, True


@router.post("/translate-line", response_model=TranslateResponse)
def translate_line(request: TranslateRequest, user_id: int = Depends(require_user_id)):
    _check_rate_limit(user_id)

    result, added = _translate_cached(request.text)
    if result is None:
        raise HTTPException(
            status_code=502,
            detail="Çeviri servisi şu anda yanıt vermiyor. Lütfen tekrar deneyin.",
        )

    if added:
        with _cache_lock:
            save("translations", _cache)

    return {"translation": result}


@router.post("/translate-batch", response_model=TranslateBatchResponse)
def translate_batch(request: TranslateBatchRequest, user_id: int = Depends(require_user_id)):
    lines = [l for l in request.lines if l.strip()]
    _check_rate_limit(user_id, cost=max(1, len(lines)))

    results: dict[str, str] = {}
    failed: list[str] = []
    any_added = False

    futures = {line: _executor.submit(_translate_cached, line) for line in lines}

    for line, future in futures.items():
        outcome, added = future.result()
        if outcome is None:
            failed.append(line)
        else:
            results[line] = outcome
            any_added = any_added or added

    if any_added:
        with _cache_lock:
            save("translations", _cache)

    if not results and failed:
        raise HTTPException(
            status_code=502,
            detail="Çeviri servisi şu anda yanıt vermiyor. Lütfen tekrar deneyin.",
        )

    return {"translations": results, "failed": failed}
