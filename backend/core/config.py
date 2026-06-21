import os
from dotenv import load_dotenv

load_dotenv(override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
FREE_DAILY_LIMIT = int(os.getenv("FREE_DAILY_LIMIT", "5"))

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/spotify/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ACCESS_TTL_SECONDS = int(os.getenv("JWT_ACCESS_TTL_SECONDS", "900"))
JWT_REFRESH_TTL_SECONDS = int(os.getenv("JWT_REFRESH_TTL_SECONDS", "2592000"))
