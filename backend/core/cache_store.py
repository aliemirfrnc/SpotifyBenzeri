import json
import threading
import time
from collections import OrderedDict
from pathlib import Path
import os
import logging

_LOCK = threading.Lock()
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

logger = logging.getLogger(__name__)

# Redis Initialization Fallback
REDIS_URL = os.getenv("REDIS_URL", "")
redis_client = None

try:
    if REDIS_URL:
        import redis
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        logger.info("Connected to Redis cache.")
except Exception as e:
    logger.warning(f"Failed to connect to Redis, falling back to Memory Cache: {e}")
    redis_client = None


class RedisCacheWrapper:
    """Wrapper to make Redis behave like the TTLLRUCache for simple get/set operations."""
    def __init__(self, name: str, ttl_seconds: int = 604800):
        self.name = name
        self.ttl_seconds = ttl_seconds
        self.client = redis_client

    def _k(self, key: str) -> str:
        return f"{self.name}:{key}"

    def get(self, key: str, default=None):
        val = self.client.get(self._k(key))
        if val is None:
            return default
        try:
            return json.loads(val)
        except Exception:
            return val

    def set(self, key: str, value):
        self.client.setex(self._k(key), self.ttl_seconds, json.dumps(value))

    def save(self):
        # Redis handles persistence independently based on its redis.conf
        pass

    def __contains__(self, key: str) -> bool:
        return self.client.exists(self._k(key)) > 0

    def __getitem__(self, key: str):
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val
        
    def __setitem__(self, key: str, value):
        self.set(key, value)


class TTLLRUCache:
    def __init__(self, name: str, max_size: int = 1000, ttl_seconds: int = 604800): # 7 days
        self.name = name
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: OrderedDict[str, dict] = OrderedDict()
        self.lock = threading.Lock()
        self._load()

    def _path(self) -> Path:
        return _DATA_DIR / f"{self.name}.json"

    def _load(self):
        path = self._path()
        if not path.exists():
            return
        try:
            with _LOCK:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            
            now = time.time()
            with self.lock:
                for k, v in data.items():
                    if isinstance(v, dict) and "timestamp" in v and "value" in v:
                        if now - v["timestamp"] < self.ttl_seconds:
                            self.cache[k] = v
                    else:
                        self.cache[k] = {"timestamp": now, "value": v}
        except Exception:
            pass

    def save(self):
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        path = self._path()
        
        with self.lock:
            now = time.time()
            keys_to_delete = [k for k, v in self.cache.items() if now - v["timestamp"] >= self.ttl_seconds]
            for k in keys_to_delete:
                del self.cache[k]
            data = dict(self.cache)

        with _LOCK:
            tmp_path = path.with_suffix(".tmp")
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            tmp_path.replace(path)

    def get(self, key: str, default=None):
        with self.lock:
            if key not in self.cache:
                return default
            
            item = self.cache[key]
            if time.time() - item["timestamp"] >= self.ttl_seconds:
                del self.cache[key]
                return default
            
            self.cache.move_to_end(key)
            return item["value"]

    def set(self, key: str, value):
        with self.lock:
            self.cache[key] = {"timestamp": time.time(), "value": value}
            self.cache.move_to_end(key)
            if len(self.cache) > self.max_size:
                self.cache.popitem(last=False)
                
    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    def __getitem__(self, key: str):
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val
        
    def __setitem__(self, key: str, value):
        self.set(key, value)


_caches: dict = {}
_caches_lock = threading.Lock()

def get_cache(name: str, max_size: int = 1000, ttl_seconds: int = 604800):
    with _caches_lock:
        if name not in _caches:
            if redis_client:
                _caches[name] = RedisCacheWrapper(name, ttl_seconds)
            else:
                _caches[name] = TTLLRUCache(name, max_size, ttl_seconds)
        return _caches[name]

def load(name: str):
    return get_cache(name)

def save(name: str, dummy_data=None) -> None:
    cache = get_cache(name)
    if hasattr(cache, "save"):
        cache.save()