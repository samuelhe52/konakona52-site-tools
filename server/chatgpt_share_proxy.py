#!/usr/bin/env python3
"""A deliberately narrow, memory-only proxy for public ChatGPT share HTML."""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
import uuid
from collections import defaultdict, deque
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8765"))
MAX_REQUEST_BYTES = 1_024
MAX_HTML_BYTES = 12 * 1024 * 1024
UPSTREAM_TIMEOUT_SECONDS = 15
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 6
MAX_CONCURRENT_FETCHES = 8
ALLOWED_ORIGINS = frozenset(
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


class RateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, address: str) -> bool:
        now = time.monotonic()
        with self._lock:
            attempts = self._requests[address]
            while attempts and attempts[0] <= now - RATE_WINDOW_SECONDS:
                attempts.popleft()
            if len(attempts) >= RATE_LIMIT:
                return False
            attempts.append(now)
            return True


RATE_LIMITER = RateLimiter()
FETCH_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_FETCHES)
UPSTREAM = urllib.request.build_opener(NoRedirect)


class ShareProxyHandler(BaseHTTPRequestHandler):
    server_version = "KonaShareProxy"
    sys_version = ""

    def log_message(self, _format: str, *_args: object) -> None:
        """Do not send share IDs, URLs, or response details to the journal."""

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self.path != "/api/chatgpt-share/fetch" or not self._valid_origin():
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_common_headers()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/api/chatgpt-share/health":
            self._send_json(HTTPStatus.OK, {"status": "ok"})
            return
        self._send_error(HTTPStatus.NOT_FOUND, "not_found")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/chatgpt-share/fetch":
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return
        if not self._valid_origin():
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        if not RATE_LIMITER.allow(self._client_address()):
            self._send_error(HTTPStatus.TOO_MANY_REQUESTS, "rate_limited")
            return

        share_id = self._share_id_from_request()
        if share_id is None:
            self._send_error(HTTPStatus.BAD_REQUEST, "invalid_request")
            return
        if not FETCH_SEMAPHORE.acquire(blocking=False):
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "busy")
            return
        try:
            self._fetch_share(share_id)
        finally:
            FETCH_SEMAPHORE.release()

    def _valid_origin(self) -> bool:
        return self.headers.get("Origin") in ALLOWED_ORIGINS

    def _client_address(self) -> str:
        # The service only listens on loopback. Nginx is the trusted producer of this header.
        return self.headers.get("X-Real-IP", self.client_address[0])

    def _share_id_from_request(self) -> str | None:
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return None
        if length < 1 or length > MAX_REQUEST_BYTES or self.headers.get_content_type() != "application/json":
            return None
        try:
            payload = json.loads(self.rfile.read(length))
            share_id = payload["shareId"]
            parsed = uuid.UUID(share_id)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None
        return str(parsed) if str(parsed).lower() == share_id.lower() else None

    def _fetch_share(self, share_id: str) -> None:
        request = urllib.request.Request(
            f"https://chatgpt.com/share/{share_id}",
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; KonaToolboxShareFetcher/1.0)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.8",
            },
        )
        try:
            with UPSTREAM.open(request, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
                content_type = response.headers.get_content_type()
                content_length = response.headers.get("Content-Length")
                if content_type != "text/html" or content_length and int(content_length) > MAX_HTML_BYTES:
                    self._send_error(HTTPStatus.BAD_GATEWAY, "upstream_unavailable")
                    return
                html = response.read(MAX_HTML_BYTES + 1)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
            self._send_error(HTTPStatus.BAD_GATEWAY, "upstream_unavailable")
            return

        if len(html) > MAX_HTML_BYTES:
            self._send_error(HTTPStatus.BAD_GATEWAY, "upstream_unavailable")
            return
        self.send_response(HTTPStatus.OK)
        self._send_common_headers()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def _send_common_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")

    def _send_json(self, status: HTTPStatus, payload: dict[str, str]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self._send_common_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, status: HTTPStatus, code: str) -> None:
        self._send_json(status, {"error": code})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), ShareProxyHandler)
    server.daemon_threads = True
    server.serve_forever()


if __name__ == "__main__":
    main()
