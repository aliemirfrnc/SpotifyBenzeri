import threading
from concurrent.futures import ThreadPoolExecutor

from deep_translator import GoogleTranslator
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.cache_store import load, save

router = APIRouter()

_cache: dict[str, str] = load("translations")
_cache_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=5)


class TranslateRequest(BaseModel):
    text: str


class TranslateResponse(BaseModel):
    translation: str


class TranslateBatchRequest(BaseModel):
    lines: list[str]


class TranslateBatchResponse(BaseModel):
    translations: dict[str, str]
    failed: list[str]


def _translate_cached(text: str) -> tuple[str | None, bool]:
    """İkinci eleman: cache'e yeni eklenip eklenmediği (diske yazma kararı için)."""
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
def translate_line(request: TranslateRequest):
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
def translate_batch(request: TranslateBatchRequest):
    lines = [l for l in request.lines if l.strip()]
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