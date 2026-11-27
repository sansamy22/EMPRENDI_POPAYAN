import calendar
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import date
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


WEB_ROOT = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.environ.get("EMPRENDI_DB_PATH", WEB_ROOT / ".emprendi-pop.sqlite3"))
PASSWORD_ITERATIONS = 600_000
SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60
MAX_REQUEST_BYTES = 16_384
COOKIE_NAME = "emprendipop_session"
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9\s().-]*$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_DUMMY_SALT = b"EmprendiPOP-login-timing-salt"


class AuthError(Exception):
    def __init__(self, status, field, message):
        super().__init__(message)
        self.status = status
        self.field = field
        self.message = message


def connect_database():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    with connect_database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL,
                username TEXT NOT NULL,
                username_key TEXT NOT NULL UNIQUE,
                contact TEXT NOT NULL,
                contact_key TEXT NOT NULL UNIQUE,
                birth_date TEXT NOT NULL,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS login_identifiers (
                identifier_key TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
            """
        )


def normalize_contact(value):
    value = value.strip()
    if "@" in value:
        return value.casefold()
    return re.sub(r"[\s().-]", "", value)


def parse_registration(payload):
    if not isinstance(payload, dict):
        raise AuthError(400, "form", "Revisa los datos e inténtalo de nuevo.")

    contact = payload.get("contact")
    username = payload.get("username")
    full_name = payload.get("full_name")
    password = payload.get("password")
    birth_date = payload.get("birth_date")
    if not all(isinstance(value, str) for value in (contact, username, full_name, password, birth_date)):
        raise AuthError(400, "form", "Completa todos los campos para crear la cuenta.")

    contact = contact.strip()
    username = username.strip()
    full_name = full_name.strip()
    if len(contact) > 254 or not (EMAIL_PATTERN.fullmatch(contact) or (
        PHONE_PATTERN.fullmatch(contact)
        and 7 <= len(re.sub(r"\D", "", contact)) <= 15
    )):
        raise AuthError(400, "contact", "Introduce un correo o número de móvil válido.")
    if not username or len(username) > 32:
        raise AuthError(400, "username", "El nombre de usuario debe tener entre 1 y 32 caracteres.")
    if not full_name or len(full_name) > 100:
        raise AuthError(400, "full_name", "Introduce un nombre completo válido.")
    if len(password) < 9 or len(password) > 128 or not any(character.isupper() for character in password):
        raise AuthError(400, "password", "Usa al menos 9 caracteres e incluye una letra mayúscula.")

    try:
        birthday = date.fromisoformat(birth_date)
    except ValueError as error:
        raise AuthError(400, "birth_date", "Selecciona una fecha de nacimiento válida.") from error

    today = date.today()
    eighteenth_year = today.year - 18
    eighteenth_day = min(today.day, calendar.monthrange(eighteenth_year, today.month)[1])
    eighteenth_birthday = date(eighteenth_year, today.month, eighteenth_day)
    if birthday > eighteenth_birthday:
        raise AuthError(400, "birth_date", "Necesitas ser mayor de edad para crear tu cuenta :D")

    contact_key = normalize_contact(contact)
    username_key = username.casefold()
    if contact_key == username_key:
        raise AuthError(409, "username", "El nombre de usuario debe ser distinto a tu teléfono o correo.")

    return {
        "contact": contact,
        "contact_key": contact_key,
        "username": username,
        "username_key": username_key,
        "full_name": full_name,
        "password": password,
        "birth_date": birthday.isoformat(),
    }


def hash_password(password, salt):
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )


def create_account(payload):
    account = parse_registration(payload)
    salt = secrets.token_bytes(16)
    password_hash = hash_password(account["password"], salt)
    created_at = int(time.time())

    with connect_database() as connection:
        existing = connection.execute(
            """
            SELECT identifier_key
            FROM login_identifiers
            WHERE identifier_key IN (?, ?)
            """,
            (account["contact_key"], account["username_key"]),
        ).fetchone()
        if existing:
            field = "contact" if existing["identifier_key"] == account["contact_key"] else "username"
            raise AuthError(409, field, "Ese teléfono, correo o nombre de usuario ya está registrado.")

        try:
            cursor = connection.execute(
                """
                INSERT INTO accounts (
                    full_name, username, username_key, contact, contact_key,
                    birth_date, password_salt, password_hash, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    account["full_name"],
                    account["username"],
                    account["username_key"],
                    account["contact"],
                    account["contact_key"],
                    account["birth_date"],
                    salt,
                    password_hash,
                    created_at,
                ),
            )
            account_id = cursor.lastrowid
            connection.executemany(
                "INSERT INTO login_identifiers (identifier_key, account_id) VALUES (?, ?)",
                (
                    (account["contact_key"], account_id),
                    (account["username_key"], account_id),
                ),
            )
        except sqlite3.IntegrityError as error:
            raise AuthError(409, "contact", "Ese teléfono, correo o nombre de usuario ya está registrado.") from error

    return {"id": account_id, "username": account["username"]}


def authenticate(identifier, password):
    if not isinstance(identifier, str) or not identifier.strip():
        raise AuthError(401, "identifier", "Nombre, telefono o gmail incorrecto")
    if not isinstance(password, str) or not password:
        raise AuthError(400, "password", "Introduce tu contraseña.")

    identifier_key = normalize_contact(identifier)
    with connect_database() as connection:
        account = connection.execute(
            """
            SELECT accounts.id, accounts.username, accounts.password_salt, accounts.password_hash
            FROM login_identifiers
            JOIN accounts ON accounts.id = login_identifiers.account_id
            WHERE login_identifiers.identifier_key = ?
            """,
            (identifier_key,),
        ).fetchone()

    if not account:
        hash_password(password, _DUMMY_SALT)
        raise AuthError(401, "identifier", "Nombre, telefono o gmail incorrecto")
    if not hmac.compare_digest(hash_password(password, account["password_salt"]), account["password_hash"]):
        raise AuthError(401, "password", "Contraseña incorrecta")
    return {"id": account["id"], "username": account["username"]}


def create_session(account_id):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    expires_at = int(time.time()) + SESSION_DURATION_SECONDS
    with connect_database() as connection:
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        connection.execute(
            "INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, account_id, expires_at),
        )
    return token


def get_session_account(token):
    if not token or not re.fullmatch(r"[A-Za-z0-9_-]{40,64}", token):
        return None
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with connect_database() as connection:
        row = connection.execute(
            """
            SELECT accounts.id, accounts.username
            FROM sessions
            JOIN accounts ON accounts.id = sessions.account_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (token_hash, int(time.time())),
        ).fetchone()
    if not row:
        return None
    return {"id": row["id"], "username": row["username"]}


def delete_session(token):
    if not token or not re.fullmatch(r"[A-Za-z0-9_-]{40,64}", token):
        return
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with connect_database() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


class LoginRateLimiter:
    def __init__(self):
        self.attempts = {}
        self.lock = threading.Lock()

    def is_limited(self, address):
        now = time.monotonic()
        with self.lock:
            attempts = [stamp for stamp in self.attempts.get(address, []) if now - stamp < 600]
            self.attempts[address] = attempts
            return len(attempts) >= 8

    def record_failure(self, address):
        with self.lock:
            self.attempts.setdefault(address, []).append(time.monotonic())

    def clear(self, address):
        with self.lock:
            self.attempts.pop(address, None)


class EmprendiHandler(BaseHTTPRequestHandler):
    server_version = "EmprendiPOP"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; "
            "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
        )
        super().end_headers()

    def send_json(self, status, payload, extra_headers=()):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for name, value in extra_headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        if self.headers.get_content_type() != "application/json":
            raise AuthError(415, "form", "El servidor requiere datos JSON.")
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise AuthError(400, "form", "La solicitud no tiene un tamaño válido.") from error
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            raise AuthError(413, "form", "La solicitud está vacía o es demasiado grande.")
        try:
            return json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise AuthError(400, "form", "No se pudieron leer los datos enviados.") from error

    def same_origin_request(self):
        host = self.headers.get("Host", "").casefold()
        if host not in ("127.0.0.1:8000", "localhost:8000"):
            return False
        origin = self.headers.get("Origin")
        if not origin:
            return True
        parsed_origin = urlsplit(origin)
        return parsed_origin.scheme == "http" and parsed_origin.netloc.casefold() == host

    def get_session_token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except CookieError:
            return ""
        morsel = cookie.get(COOKIE_NAME)
        return morsel.value if morsel else ""

    def do_GET(self):
        request_path = urlsplit(self.path).path
        if request_path == "/favicon.ico":
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if request_path == "/":
            self.send_response(302)
            self.send_header("Location", "/emprendi_inicio_sesi%C3%B3n/inicio_sesi%C3%B3n.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if request_path == "/api/session":
            account = get_session_account(self.get_session_token())
            if not account:
                self.send_json(401, {"authenticated": False})
                return
            self.send_json(200, {"authenticated": True, "username": account["username"]})
            return

        relative_path = Path(unquote(request_path).lstrip("/"))
        if relative_path.is_absolute() or ".." in relative_path.parts:
            self.send_json(404, {"message": "No se encontró la página solicitada."})
            return
        target = WEB_ROOT / relative_path

        try:
            resolved_target = target.resolve()
            resolved_target.relative_to(WEB_ROOT)
        except (OSError, ValueError):
            self.send_json(404, {"message": "No se encontró la página solicitada."})
            return
        if not resolved_target.is_file():
            self.send_json(404, {"message": "No se encontró la página solicitada."})
            return

        content = resolved_target.read_bytes()
        content_type = mimetypes.guess_type(resolved_target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in ("application/javascript", "application/json"):
            content_type += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        if not self.same_origin_request():
            self.send_json(403, {"message": "La solicitud no pertenece a este sitio."})
            return

        try:
            payload = self.read_json()
            request_path = urlsplit(self.path).path
            if request_path == "/api/register":
                account = create_account(payload)
                self.send_json(201, account)
            elif request_path == "/api/login":
                if not isinstance(payload, dict):
                    raise AuthError(400, "form", "Revisa los datos e inténtalo de nuevo.")
                address = self.client_address[0]
                if self.server.login_limiter.is_limited(address):
                    self.send_json(429, {"message": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."})
                    return
                account = authenticate(payload.get("identifier"), payload.get("password"))
                self.server.login_limiter.clear(address)
                token = create_session(account["id"])
                cookie = (
                    f"{COOKIE_NAME}={token}; HttpOnly; SameSite=Strict; "
                    f"Path=/; Max-Age={SESSION_DURATION_SECONDS}"
                )
                self.send_json(
                    200,
                    {"authenticated": True, "username": account["username"]},
                    (("Set-Cookie", cookie),),
                )
            elif request_path == "/api/logout":
                delete_session(self.get_session_token())
                cookie = f"{COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
                self.send_json(200, {"authenticated": False}, (("Set-Cookie", cookie),))
            else:
                self.send_json(404, {"message": "No se encontró la operación solicitada."})
        except AuthError as error:
            if urlsplit(self.path).path == "/api/login" and error.status == 401:
                self.server.login_limiter.record_failure(self.client_address[0])
            self.send_json(error.status, {"field": error.field, "message": error.message})
        except sqlite3.Error:
            self.send_json(500, {"message": "No se pudo guardar o consultar la cuenta. Inténtalo más tarde."})


def main():
    initialize_database()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), EmprendiHandler)
    server.login_limiter = LoginRateLimiter()
    print("EmprendiPOP disponible en http://127.0.0.1:8000 (solo acceso local).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
