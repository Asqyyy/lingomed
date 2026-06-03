"""
Shared rate-limiting instances.

We define the limiter here (not in main.py) so that routers can import
it with @limiter.limit() without creating circular imports.

WebSocket endpoints cannot use slowapi decorators directly (slowapi only
supports HTTP routes). We use a simple in-memory sliding-window counter
for WebSocket connections instead.
"""
from collections import defaultdict
from time import time

from slowapi import Limiter
from slowapi.util import get_remote_address

# HTTP rate limiter (used via @limiter.limit() decorator on routes)
limiter = Limiter(key_func=get_remote_address)

# ── WebSocket in-memory rate limiter ──────────────────────────────────────
_WS_WINDOW_SECONDS = 60
_WS_MAX_CONNECTIONS = 5  # per IP per window

# Maps IP → list of connection timestamps within the window
_ws_timestamps: dict[str, list[float]] = defaultdict(list)


def check_ws_rate_limit(ip: str) -> bool:
    """Return True if the connection is allowed, False if rate-limited."""
    now = time()
    window_start = now - _WS_WINDOW_SECONDS
    # Purge timestamps outside the window
    _ws_timestamps[ip] = [t for t in _ws_timestamps[ip] if t > window_start]
    if len(_ws_timestamps[ip]) >= _WS_MAX_CONNECTIONS:
        return False
    _ws_timestamps[ip].append(now)
    return True
