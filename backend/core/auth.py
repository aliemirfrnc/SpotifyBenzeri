import hashlib
import os
import secrets
import time

from backend.core.db import get_conn, get_lock

TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 gün


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return secrets.compare_digest(actual, expected)


def create_user(email: str, password: str) -> int:
    conn = get_conn()
    with get_lock():
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (email.lower().strip(), hash_password(password), time.time()),
        )
        conn.commit()
        return cur.lastrowid


def get_user_by_email(email: str):
    conn = get_conn()
    with get_lock():
        cur = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (email.lower().strip(),),
        )
        return cur.fetchone()


def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    conn = get_conn()
    with get_lock():
        conn.execute(
            "INSERT INTO auth_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, now + TOKEN_TTL_SECONDS),
        )
        conn.commit()
    return token


def get_user_id_from_token(token: str) -> int | None:
    conn = get_conn()
    with get_lock():
        cur = conn.execute(
            "SELECT user_id, expires_at FROM auth_tokens WHERE token = ?",
            (token,),
        )
        row = cur.fetchone()
    if not row:
        return None
    user_id, expires_at = row
    if expires_at < time.time():
        delete_token(token)
        return None
    return user_id


def delete_token(token: str) -> None:
    conn = get_conn()
    with get_lock():
        conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        conn.commit()


def cleanup_expired() -> int:
    """Süresi dolmuş auth token'larını ve 10 dakikadan eski kullanılmamış
    oauth_states kayıtlarını siler. Silinen toplam satır sayısını döner."""
    now = time.time()
    conn = get_conn()
    with get_lock():
        cur1 = conn.execute("DELETE FROM auth_tokens WHERE expires_at < ?", (now,))
        cur2 = conn.execute("DELETE FROM oauth_states WHERE created_at < ?", (now - 600,))
        conn.commit()
        return cur1.rowcount + cur2.rowcount