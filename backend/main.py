import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.auth import cleanup_expired
from backend.core.db import init_db
from backend.routes.auth import router as auth_router
from backend.routes.chat import router as chat_router
from backend.routes.lyrics import router as lyrics_router, warmup as lyrics_warmup
from backend.routes.translate import router as translate_router
from backend.routes.spotify import router as spotify_router
from backend.routes.word_info import router as word_info_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(lyrics_router)
app.include_router(translate_router)
app.include_router(spotify_router)
app.include_router(word_info_router)


def _cleanup_loop():
    while True:
        try:
            removed = cleanup_expired()
            if removed:
                print(f"AUTH CLEANUP: {removed} eski kayıt silindi.")
        except Exception as e:
            print("AUTH CLEANUP ERROR:", repr(e))
        time.sleep(6 * 60 * 60)  # 6 saatte bir


@app.on_event("startup")
def on_startup():
    init_db()
    threading.Thread(target=lyrics_warmup, daemon=True).start()
    threading.Thread(target=_cleanup_loop, daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok"}