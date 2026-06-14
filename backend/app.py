import warnings
warnings.filterwarnings("ignore")

import os
import re
import certifi
import joblib
import jwt
import secrets
from datetime import datetime, timezone, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError, OperationFailure, ServerSelectionTimeoutError
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

# ── Load .env (local dev only — never overrides real environment variables) ───
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=False)
except ImportError:
    pass


# ── OCR engine setup ─────────────────────────────────────────────────────────
# Tesseract is the only OCR engine. It is a system binary (~15 MB RAM as a
# subprocess), not a Python model. On Render it is installed via render.yaml
# buildCommand: apt-get install -y tesseract-ocr
# On Windows (local dev) it must be installed from https://github.com/UB-Mannheim/tesseract/wiki

import shutil as _shutil

TESSERACT_AVAILABLE = False

try:
    import pytesseract as _pytesseract

    # Priority: env var TESSERACT_CMD → PATH → Windows default install path
    _tess_cmd = os.getenv("TESSERACT_CMD", "").strip()
    if _tess_cmd and os.path.isfile(_tess_cmd):
        _pytesseract.pytesseract.tesseract_cmd = _tess_cmd
        print(f"[OCR] Tesseract path from TESSERACT_CMD env: {_tess_cmd}")
    else:
        _which = _shutil.which("tesseract")
        if _which:
            _pytesseract.pytesseract.tesseract_cmd = _which
            print(f"[OCR] Tesseract found via PATH: {_which}")
        elif os.name == "nt":
            _win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.isfile(_win_path):
                _pytesseract.pytesseract.tesseract_cmd = _win_path
                print(f"[OCR] Tesseract found at Windows default path: {_win_path}")

    _ver = _pytesseract.get_tesseract_version()
    TESSERACT_AVAILABLE = True
    print(f"[OCR] Tesseract ready ✓  (cmd={_pytesseract.pytesseract.tesseract_cmd}, version={_ver})")

except Exception as _tess_err:
    print(f"[OCR] Tesseract unavailable: {type(_tess_err).__name__}: {_tess_err}")
    print("[OCR] Image uploads will return an error. On Render, ensure render.yaml buildCommand includes: apt-get install -y tesseract-ocr")

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
_allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)
CORS(
    app,
    origins=_allowed_origins,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET  = os.getenv("JWT_SECRET", "sentimentai_jwt_secret_2024")
JWT_EXPIRES = timedelta(hours=48)

def make_token(email):
    payload = {"email": email, "exp": datetime.now(timezone.utc) + JWT_EXPIRES}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
        return payload.get("email")
    except jwt.ExpiredSignatureError:
        return "__expired__"
    except Exception:
        return None

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI environment variable is not set. "
        "Set it in your Render dashboard (or .env for local dev) to a MongoDB Atlas connection string."
    )

# Connect with TLS only if it is an Atlas connection (i.e. starts with mongodb+srv or contains tls/ssl params, or isn't localhost)
is_atlas = MONGO_URI.startswith("mongodb+srv://") or "replicaSet" in MONGO_URI or "mongodb.net" in MONGO_URI

mongo_kwargs = {
    "serverSelectionTimeoutMS": 30000,
    "connectTimeoutMS": 30000,
    "socketTimeoutMS": 30000
}

if is_atlas:
    mongo_kwargs["tls"] = True
    mongo_kwargs["tlsCAFile"] = certifi.where()

print(f"[DB] Initializing MongoDB client with URI: {MONGO_URI} (Atlas={is_atlas})")
client = MongoClient(MONGO_URI, **mongo_kwargs)

# Verify database connection on startup
try:
    client.admin.command('ping')
    print("==================================================================")
    print(f"DATABASE CONNECTION VERIFIED SUCCESSFUL: {MONGO_URI}")
    print("==================================================================")
except Exception as e:
    print("==================================================================")
    print(f"DATABASE CONNECTION FAILED ON STARTUP: {e}")
    print("==================================================================")


# Try to get database from URI, default to sentiment_analysis
db = None
try:
    # get_default_database can raise if no db in URI
    db = client.get_default_database()
except Exception:
    pass

if db is None:
    db = client["sentiment_analysis"]

users      = db["users"]
collection = db["history"]


# ── ML Model ──────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
model      = joblib.load(os.path.join(BASE_DIR, "model", "model.pkl"))
vectorizer = joblib.load(os.path.join(BASE_DIR, "model", "vectorizer.pkl"))

# ── Prediction helpers ────────────────────────────────────────────────────────
NEGATION_RE = re.compile(
    r"\b(not|no|never|neither|nor|cannot|can't|won't|don't|doesn't|didn't|isn't|wasn't|aren't|weren't|haven't|hasn't|hadn't|shouldn't|wouldn't|couldn't)\s+(\w+)",
    re.IGNORECASE
)

SARCASM_SIGNALS = [
    "yeah right", "oh great", "oh fantastic", "just love", "just loved",
    "so much fun", "best day ever", "best way", "oh wonderful", "oh perfect",
    "totally fine", "absolutely love", "love waiting", "love being",
    "thanks a lot", "thanks so much", "great job", "well done",
    "oh sure", "of course", "obviously", "clearly", "as if",
]

NEUTRAL_THRESHOLD = 0.62
SARCASM_PENALTY   = 0.15

def preprocess(text):
    text = str(text).lower()
    text = re.sub(r"n't", " not", text)
    text = re.sub(r"'re", " are", text)
    text = re.sub(r"'ve", " have", text)
    text = re.sub(r"'ll", " will", text)
    text = re.sub(r"'d",  " would", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = NEGATION_RE.sub(lambda m: m.group(1) + "_" + m.group(2), text)
    text = re.sub(r"[^a-z\s_]", "", text)
    return text.strip()

def run_sentiment(raw_text):
    cleaned = preprocess(raw_text)
    vec     = vectorizer.transform([cleaned])
    proba   = model.predict_proba(vec)[0]
    neg_p, pos_p = float(proba[0]), float(proba[1])

    lower = raw_text.lower()
    if any(sig in lower for sig in SARCASM_SIGNALS):
        pos_p = max(0.0, pos_p - SARCASM_PENALTY)
        neg_p = min(1.0, neg_p + SARCASM_PENALTY)

    confidence = round(max(pos_p, neg_p), 2)
    if confidence < NEUTRAL_THRESHOLD:
        return "Neutral", confidence
    return ("Positive" if pos_p > neg_p else "Negative"), confidence

# ── Helpers ───────────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def ok(data, code=200):
    return jsonify(data), code

def err(msg, code=400):
    return jsonify({"error": msg}), code

def safe_hash_check(stored, password):
    if isinstance(stored, bytes):
        stored = stored.decode("utf-8")
    return check_password_hash(stored, password)

def sanitize_email(raw):
    """Reject non-string / Mongo operator payloads; return clean lowercase email or None."""
    if not isinstance(raw, str):
        return None
    clean = raw.strip().lower()
    if not EMAIL_RE.match(clean):
        return None
    return clean

def db_err(e, custom_msg="Service temporarily unavailable. Please try again later."):
    """Convert any PyMongoError into a clean JSON 503 response, outputting developer errors to stdout only."""
    print(f"[DEVELOPER DB LOG] {type(e).__name__}: {e}")
    return err(custom_msg, 503)


# ── In-memory OTP store ───────────────────────────────────────────────────────
_otp_store: dict = {}


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/signup", methods=["POST"])
def signup():
    data     = request.get_json(force=True, silent=True) or {}
    email    = sanitize_email(data.get("email", ""))
    password = data.get("password", "")
    if not isinstance(password, str):
        return err("Invalid input")
    password = password.strip()
    name     = str(data.get("name", "")).strip()

    if not email:
        return err("Invalid email format")
    if not password:
        return err("Password is required")
    if len(password) < 6:
        return err("Password must be at least 6 characters")

    try:
        existing = users.find_one({"email": email})
    except PyMongoError as e:
        return db_err(e, "Unable to create account right now. Please try again later.")

    if existing:
        return err("Email already registered", 409)

    try:
        users.insert_one({
            "name":       name,
            "email":      email,
            "password_hash": generate_password_hash(password),
            "created_at": datetime.now(timezone.utc)
        })
    except PyMongoError as e:
        return db_err(e, "Unable to create account right now. Please try again later.")

    return ok({"message": "Account created successfully"}, 201)


@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json(force=True, silent=True) or {}
    email    = sanitize_email(data.get("email", ""))
    password = data.get("password", "")
    if not isinstance(password, str):
        return err("Invalid input")
    password = password.strip()

    if not email:
        return err("Invalid email format")
    if not password:
        return err("Password is required")

    try:
        user = users.find_one({"email": email})
    except PyMongoError as e:
        return db_err(e, "Unable to sign in right now. Please try again later.")

    if not user:
        return err("No account found with this email", 404)
    
    stored_hash = user.get("password_hash") or user.get("password")
    if not stored_hash or not safe_hash_check(stored_hash, password):
        return err("Incorrect password", 401)

    return ok({
        "message": "Login successful",
        "name":    user.get("name", ""),
        "email":   email,
        "token":   make_token(email)
    })


@app.route("/request-otp", methods=["POST"])
def request_otp():
    data  = request.get_json(force=True, silent=True) or {}
    email = sanitize_email(data.get("email", ""))
    if not email:
        return err("Invalid email")

    try:
        exists = users.find_one({"email": email})
    except PyMongoError as e:
        return db_err(e, "Unable to reset password right now. Please try again later.")

    if not exists:
        return err("No account found with this email", 404)

    otp = secrets.token_hex(3).upper()  # 6-char hex OTP
    _otp_store[email] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=10)}
    print(f"[OTP] {email} -> {otp}")   # server log — replace with email send in production
    return ok({"message": "OTP sent to your email", "otp": otp})


@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data         = request.get_json(force=True, silent=True) or {}
    email        = sanitize_email(data.get("email", ""))
    otp          = str(data.get("otp", "")).strip().upper()
    new_password = data.get("new_password", "")
    if not isinstance(new_password, str):
        return err("Invalid input")
    new_password = new_password.strip()

    if not email:
        return err("Invalid email format")
    if not otp:
        return err("Verification code is required")
    if not new_password:
        return err("New password is required")
    if len(new_password) < 6:
        return err("Password must be at least 6 characters")

    try:
        exists = users.find_one({"email": email})
    except PyMongoError as e:
        return db_err(e, "Unable to reset password right now. Please try again later.")

    if not exists:
        return err("No account found with this email", 404)

    record = _otp_store.get(email)
    if not record:
        return err("No verification code requested for this email. Click 'Send verification code' first.", 400)
    if datetime.now(timezone.utc) > record["expires"]:
        _otp_store.pop(email, None)
        return err("Verification code has expired. Please request a new one.", 400)
    if record["otp"] != otp:
        return err("Invalid verification code", 400)

    _otp_store.pop(email, None)
    try:
        users.update_one(
            {"email": email},
            {
                "$set": {"password_hash": generate_password_hash(new_password)},
                "$unset": {"password": ""}
            }
        )
    except PyMongoError as e:
        return db_err(e, "Unable to reset password right now. Please try again later.")

    return ok({"message": "Password reset successful"})


# ═══════════════════════════════════════════════════════════════════════════════
# SENTIMENT ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/predict", methods=["POST"])
def predict():
    data  = request.get_json(force=True, silent=True) or {}
    text  = data.get("text", "")
    if not isinstance(text, str):
        return err("Invalid input")
    text = text.strip()

    jwt_email = verify_token()
    if jwt_email == "__expired__":
        return err("Session expired. Please log in again.", 401)
    raw_email = jwt_email or data.get("email", "")
    email = sanitize_email(raw_email) if raw_email else None

    if not text:
        return err("Text cannot be empty")

    lines = [l.strip() for l in text.splitlines() if l.strip()]

    if len(lines) > 1:
        results = []
        for line in lines:
            s, c = run_sentiment(line)
            results.append({"text": line, "sentiment": s, "confidence": c})
            if email:
                try:
                    collection.insert_one({
                        "user_email": email, "text": line,
                        "sentiment": s, "confidence": c,
                        "created_at": datetime.now(timezone.utc)
                    })
                except PyMongoError:
                    pass
        pos = sum(1 for r in results if r["sentiment"] == "Positive")
        neg = sum(1 for r in results if r["sentiment"] == "Negative")
        neu = sum(1 for r in results if r["sentiment"] == "Neutral")
        overall  = max([(pos, "Positive"), (neg, "Negative"), (neu, "Neutral")], key=lambda x: x[0])[1]
        avg_conf = round(sum(r["confidence"] for r in results) / len(results), 2)
        return ok({
            "sentiment": overall, "confidence": avg_conf,
            "batch": True, "multiple": True, "results": results,
            "summary": {"positive": pos, "negative": neg, "neutral": neu, "total": len(results)}
        })

    sentiment, confidence = run_sentiment(text)
    if email:
        try:
            collection.insert_one({
                "user_email": email, "text": text,
                "sentiment": sentiment, "confidence": confidence,
                "created_at": datetime.now(timezone.utc)
            })
        except PyMongoError:
            pass
    return ok({"sentiment": sentiment, "confidence": confidence})


@app.route("/history", methods=["GET"])
def history():
    jwt_email = verify_token()
    if jwt_email == "__expired__":
        return err("Session expired. Please log in again.", 401)
    raw_email = jwt_email or request.args.get("email", "")
    email = sanitize_email(raw_email) if raw_email else None
    if not email:
        return ok([])

    try:
        data = [
            {
                "id":         str(item["_id"]),
                "text":       item["text"],
                "sentiment":  item["sentiment"],
                "confidence": item.get("confidence"),
                "created_at": item["created_at"].strftime("%d %b, %I:%M %p")
                              if item.get("created_at") else ""
            }
            for item in collection.find({"user_email": email}).sort("created_at", -1).limit(10)
        ]
    except PyMongoError as e:
        return db_err(e, "Unable to fetch history right now. Please try again later.")
    return ok(data)


@app.route("/delete-history/<id>", methods=["DELETE"])
def delete_history(id):
    jwt_email = verify_token()
    if jwt_email == "__expired__":
        return err("Session expired. Please log in again.", 401)
    try:
        result = collection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            return err("Record not found", 404)
        return ok({"message": "Deleted"})
    except PyMongoError as e:
        return db_err(e, "Unable to delete record right now. Please try again later.")
    except Exception:
        return err("Invalid ID")


# ═══════════════════════════════════════════════════════════════════════════════
# SUPPORT MESSAGE
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/support-message", methods=["POST"])
def support_message():
    data    = request.get_json(force=True, silent=True) or {}
    message = str(data.get("message", "")).strip()
    email   = str(data.get("email", "")).strip()
    if not message:
        return err("Message cannot be empty")
    print(f"[SUPPORT] from={email or 'anonymous'} | {message[:500]}")
    try:
        db["support_messages"].insert_one({
            "email":      email,
            "message":    message,
            "created_at": datetime.now(timezone.utc)
        })
    except PyMongoError:
        pass  # don't fail the user if support logging fails
    return ok({"message": "Support message received"})


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def home():
    return "API Running 🚀"


# ═══════════════════════════════════════════════════════════════════════════════
# FILE UPLOAD
# ═══════════════════════════════════════════════════════════════════════════════

def _preprocess_image(img):
    """
    Prepare a PIL image for Tesseract OCR:
    - Convert to greyscale (removes colour noise)
    - Upscale if too narrow (Tesseract accuracy drops below ~600px wide)
    - Light sharpening for compressed JPEGs
    - Return as RGB so pytesseract accepts it
    """
    from PIL import ImageFilter
    img = img.convert("L")
    if img.width < 600:
        scale = max(2, 600 // img.width)
        img = img.resize(
            (img.width * scale, img.height * scale),
            resample=getattr(__import__("PIL").Image, "LANCZOS", 1)
        )
    img = img.filter(ImageFilter.SHARPEN)
    return img.convert("RGB")


# Patterns that identify Twitter/X UI noise lines — not tweet body text
_TWEET_NOISE = re.compile(
    r"^(\.?@[\w.]+"                        # @username / .@username
    r"|\d{1,2}[:/]\d{2}(\s?[APap][Mm])?"  # timestamps  12:34 / 12:34 PM
    r"|\d+\s*(retweets?|likes?|replies?|views?|reposts?|bookmarks?)"  # engagement counts
    r"|retweet(ed)?|retweeted"
    r"|like(d|s)?|reply|replies"
    r"|follow(ing|ers?)?"
    r"|\d+[KkMm]?\s*(likes?|retweets?|views?|replies?)"
    r"|share|embed|copy link|report"
    r"|more|promoted|ad\b"
    r"|[\u2665\u2764\U0001F499\U0001F9E1\u2B50\U0001F4AC\U0001F504\U0001F4E4]+"  # heart/RT icons
    r"|\d+$"                               # bare numbers (like/RT counts)
    r")",
    re.IGNORECASE
)

def _extract_tweet_text(raw: str) -> str:
    """
    From raw Tesseract output of a tweet screenshot, keep only the tweet body:
    - Drop username lines, timestamps, engagement counts, and UI chrome.
    - Collapse remaining lines into a single space-joined string.
    """
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        if _TWEET_NOISE.match(line):
            continue
        # Drop lines that are purely symbols / single characters
        if len(re.sub(r"[^\w]", "", line)) < 2:
            continue
        lines.append(line)
    return " ".join(lines)


def _run_ocr(image_bytes):
    """
    Extract text from image bytes using Tesseract.
    Returns (text, error_msg). On success text is a str and error_msg is None.
    On failure text is None and error_msg is a user-facing string.
    """
    import io
    from PIL import Image

    if not TESSERACT_AVAILABLE:
        return None, (
            "OCR is not available on this server. "
            "Please copy the text manually and paste it into the text box."
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))  # re-open: verify() consumes the stream
    except Exception as e:
        print(f"[OCR] Image decode failed: {type(e).__name__}: {e}")
        return None, f"Could not read the image file ({type(e).__name__}). Make sure the file is a valid PNG or JPG."

    preprocessed = _preprocess_image(img)
    try:
        # PSM 6: single uniform block of text -- best for screenshots and scans
        raw = _pytesseract.image_to_string(preprocessed, config="--psm 6 --oem 3").strip()
        if not raw:
            raw = _pytesseract.image_to_string(img, config="--psm 6 --oem 3").strip()
        if raw:
            text = _extract_tweet_text(raw)
            if not text:
                text = " ".join(raw.split())  # fallback: collapse as-is
            print(f"[OCR] Extracted {len(text)} chars")
            return text, None
        print("[OCR] Tesseract returned empty string")
    except Exception as e:
        print(f"[OCR] Tesseract error: {type(e).__name__}: {e}")
        return None, "OCR failed while processing the image. Please try a clearer image."

    return None, (
        "No text could be extracted from this image. "
        "Try uploading a clearer, higher-resolution image with visible text."
    )

@app.route("/ocr-image", methods=["POST"])
def ocr_image():
    """Extract text from an uploaded image and return it without running sentiment."""
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    f = request.files["file"]
    if not f.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        return jsonify({"success": False, "error": "Only JPG and PNG images are supported"}), 400
    try:
        image_bytes = f.read()
        if not image_bytes:
            return jsonify({"success": False, "error": "Uploaded file is empty"}), 400
    except Exception:
        return jsonify({"success": False, "error": "Could not read uploaded file"}), 400
    text, ocr_err = _run_ocr(image_bytes)
    if ocr_err:
        return jsonify({"success": False, "error": ocr_err}), 422
    return jsonify({"success": True, "text": text})


@app.route("/analyze-file", methods=["POST"])
def analyze_file():
    if "file" not in request.files:
        return err("No file uploaded")
    f    = request.files["file"]
    name = f.filename.lower()
    text = ""

    try:
        if name.endswith(".txt"):
            text = f.read().decode("utf-8").strip()

        elif name.endswith(".pdf"):
            import fitz
            doc  = fitz.open(stream=f.read(), filetype="pdf")
            text = " ".join(page.get_text() for page in doc).strip()

        elif name.endswith((".jpg", ".jpeg", ".png")):
            text, ocr_err = _run_ocr(f.read())
            if ocr_err:
                return jsonify({"success": False, "error": ocr_err}), 422

        else:
            return err("Unsupported file type. Use .txt, .pdf, .jpg, or .png")

    except Exception as e:
        print(f"[FILE ERROR] {type(e).__name__}: {e}")
        return err("Could not read file. Please check the file and try again.")

    if not text:
        return err("No text found in file")

    sentiment, confidence = run_sentiment(text)

    jwt_email = verify_token()
    raw_email = (jwt_email if jwt_email and jwt_email != "__expired__"
                 else request.form.get("email", ""))
    email = sanitize_email(raw_email) if raw_email else None
    if email:
        try:
            collection.insert_one({
                "user_email": email,
                "text":       text[:500],
                "sentiment":  sentiment,
                "confidence": confidence,
                "created_at": datetime.now(timezone.utc)
            })
        except PyMongoError:
            pass
    return ok({"sentiment": sentiment, "confidence": confidence, "text": text[:300]})


# ═══════════════════════════════════════════════════════════════════════════════
# PDF EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

def _sentiment_color(s):
    return {"Positive": "#16a34a", "Negative": "#dc2626"}.get(s, "#b45309")


def _build_pdf(buf, records, current_text, current_sentiment, current_confidence, user_email):
    """Build a professional multi-section PDF into buf (BytesIO)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import (
        BaseDocTemplate, Frame, PageTemplate,
        Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether, PageBreak
    )
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

    W, H = A4
    ORANGE   = colors.HexColor("#f97316")
    GRAY_BG  = colors.HexColor("#f8fafc")
    GRAY_LT  = colors.HexColor("#e2e8f0")
    GRAY_TXT = colors.HexColor("#64748b")
    BLACK    = colors.HexColor("#0f172a")
    GREEN    = colors.HexColor("#16a34a")
    RED      = colors.HexColor("#dc2626")
    AMBER    = colors.HexColor("#b45309")
    WHITE    = colors.white

    LMARGIN = 2.2 * cm
    RMARGIN = 2.2 * cm
    TMARGIN = 2.0 * cm
    BMARGIN = 2.2 * cm

    # ── Page template with header rule + footer ──────────────────────────────
    def _page_decor(canvas, doc):
        canvas.saveState()
        # header line
        canvas.setStrokeColor(ORANGE)
        canvas.setLineWidth(2.5)
        canvas.line(LMARGIN, H - 1.2 * cm, W - RMARGIN, H - 1.2 * cm)
        # header brand
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(ORANGE)
        canvas.drawString(LMARGIN, H - 0.95 * cm, "SentimentAI")
        canvas.setFillColor(GRAY_TXT)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawRightString(W - RMARGIN, H - 0.95 * cm, "AI-Powered Sentiment Analysis")
        # footer line
        canvas.setStrokeColor(GRAY_LT)
        canvas.setLineWidth(0.8)
        canvas.line(LMARGIN, BMARGIN - 0.35 * cm, W - RMARGIN, BMARGIN - 0.35 * cm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GRAY_TXT)
        canvas.drawString(LMARGIN, BMARGIN - 0.65 * cm,
            f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p UTC')}  ·  {user_email or 'Guest'}")
        canvas.drawRightString(W - RMARGIN, BMARGIN - 0.65 * cm,
            f"Page {doc.page}")
        canvas.restoreState()

    frame = Frame(LMARGIN, BMARGIN, W - LMARGIN - RMARGIN, H - TMARGIN - BMARGIN,
                  id="main", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=LMARGIN, rightMargin=RMARGIN,
                          topMargin=TMARGIN + 0.6 * cm, bottomMargin=BMARGIN + 0.4 * cm)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_page_decor)])

    # ── Styles ────────────────────────────────────────────────────────────────
    def S(name, **kw):
        defaults = dict(fontName="Helvetica", fontSize=10, leading=14,
                        textColor=BLACK, alignment=TA_LEFT)
        defaults.update(kw)
        return ParagraphStyle(name, **defaults)

    sTitle   = S("sTitle",   fontName="Helvetica-Bold", fontSize=26, leading=32,
                             textColor=ORANGE, spaceAfter=4)
    sSubtitle= S("sSub",     fontSize=10, textColor=GRAY_TXT, spaceAfter=2)
    sH2      = S("sH2",      fontName="Helvetica-Bold", fontSize=13, leading=18,
                             textColor=BLACK, spaceBefore=14, spaceAfter=6)
    sH3      = S("sH3",      fontName="Helvetica-Bold", fontSize=10, leading=14,
                             textColor=GRAY_TXT, spaceBefore=8, spaceAfter=4)
    sBody    = S("sBody",    fontSize=9.5, leading=14, textColor=BLACK, spaceAfter=4)
    sCaption = S("sCaption", fontSize=8,  leading=11, textColor=GRAY_TXT, spaceAfter=2)
    sTH      = S("sTH",      fontName="Helvetica-Bold", fontSize=9, textColor=WHITE,
                             alignment=TA_CENTER)
    sTD      = S("sTD",      fontSize=9, leading=13, textColor=BLACK, alignment=TA_LEFT)
    sTDc     = S("sTDc",     fontSize=9, leading=13, textColor=BLACK, alignment=TA_CENTER)
    sResult  = S("sResult",  fontName="Helvetica-Bold", fontSize=16, leading=20,
                             textColor=colors.HexColor(_sentiment_color(current_sentiment)),
                             spaceAfter=4)
    sCurrent = S("sCurrent", fontSize=9.5, leading=14, textColor=BLACK, spaceAfter=2)

    def hr(): return HRFlowable(width="100%", thickness=0.8, color=GRAY_LT, spaceAfter=10, spaceBefore=6)

    # ── Aggregate stats ───────────────────────────────────────────────────────
    all_records = records  # already sorted newest-first from DB
    total  = len(all_records)
    n_pos  = sum(1 for r in all_records if r["sentiment"] == "Positive")
    n_neg  = sum(1 for r in all_records if r["sentiment"] == "Negative")
    n_neu  = sum(1 for r in all_records if r["sentiment"] == "Neutral")
    avg_cf = (sum(r.get("confidence", 0) or 0 for r in all_records) / total) if total else 0

    story = []

    # ══════════════════════════════════════════════════════════════════════════
    # TITLE PAGE BLOCK
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("SentimentAI", sTitle))
    story.append(Paragraph("Analysis Report",
        S("sT2", fontName="Helvetica-Bold", fontSize=18, leading=24,
          textColor=BLACK, spaceAfter=6)))
    story.append(Paragraph(
        f"Prepared for: <b>{user_email or 'Guest User'}</b>  ·  "
        f"Generated: <b>{datetime.now(timezone.utc).strftime('%d %B %Y, %I:%M %p UTC')}</b>",
        sSubtitle))
    story.append(Paragraph(
        "Powered by Logistic Regression + TF-IDF · scikit-learn",
        S("sPow", fontSize=8, textColor=GRAY_TXT, spaceAfter=10)))
    story.append(hr())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — CURRENT ANALYSIS RESULT
    # ══════════════════════════════════════════════════════════════════════════
    if current_sentiment and current_text:
        story.append(Paragraph("Current Analysis", sH2))
        story.append(KeepTogether([
            Paragraph(f"{current_sentiment}  —  {int(current_confidence * 100)}% confidence", sResult),
            Paragraph(
                "The text conveys an optimistic or satisfied tone." if current_sentiment == "Positive"
                else "The text conveys a critical or dissatisfied tone." if current_sentiment == "Negative"
                else "The text appears factual, balanced, or unclear in tone.",
                sCaption),
            Spacer(1, 6),
            Paragraph("<b>Analyzed Text:</b>", sH3),
            Paragraph(current_text[:2000], sBody),
        ]))
        story.append(hr())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — SUMMARY STATISTICS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("Sentiment Distribution Summary", sH2))

    if total == 0:
        story.append(Paragraph("No analysis history found for this account.", sBody))
    else:
        pct = lambda n: f"{round(n / total * 100)}%" if total else "0%"
        summary_data = [
            [Paragraph("Metric",    sTH), Paragraph("Count", sTH), Paragraph("Percentage", sTH)],
            [Paragraph("✓ Positive", S("sPos", fontSize=9, textColor=GREEN)),
             Paragraph(str(n_pos), sTDc), Paragraph(pct(n_pos), sTDc)],
            [Paragraph("✗ Negative", S("sNeg", fontSize=9, textColor=RED)),
             Paragraph(str(n_neg), sTDc), Paragraph(pct(n_neg), sTDc)],
            [Paragraph("~ Neutral",  S("sNeu", fontSize=9, textColor=AMBER)),
             Paragraph(str(n_neu), sTDc), Paragraph(pct(n_neu), sTDc)],
            [Paragraph("<b>Total</b>", S("sTot", fontName="Helvetica-Bold", fontSize=9, textColor=BLACK)),
             Paragraph(f"<b>{total}</b>", S("sTotV", fontName="Helvetica-Bold", fontSize=9,
                                            textColor=BLACK, alignment=TA_CENTER)),
             Paragraph("<b>100%</b>", S("sTotP", fontName="Helvetica-Bold", fontSize=9,
                                        textColor=BLACK, alignment=TA_CENTER))],
        ]
        col_w = [9 * cm, 3.5 * cm, 3.5 * cm]
        st = Table(summary_data, colWidths=col_w, repeatRows=1)
        st.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), ORANGE),
            ("ROWBACKGROUNDS",(0, 1), (-1, -2), [GRAY_BG, WHITE]),
            ("BACKGROUND",    (0, -1),(-1, -1), colors.HexColor("#f1f5f9")),
            ("GRID",          (0, 0), (-1, -1), 0.5, GRAY_LT),
            ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING",   (0, 0), (0, -1),  10),
            ("ROWBACKGROUNDS",(0, -1),(-1, -1), [colors.HexColor("#f1f5f9")]),
        ]))
        story.append(KeepTogether([st, Spacer(1, 4)]))
        story.append(Paragraph(
            f"Average confidence across all analyses: <b>{round(avg_cf * 100)}%</b>",
            S("sAvg", fontSize=9, textColor=GRAY_TXT, spaceAfter=10)))

    story.append(hr())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — FULL HISTORY TABLE
    # ══════════════════════════════════════════════════════════════════════════
    if all_records:
        story.append(Paragraph("Complete Analysis History", sH2))
        story.append(Paragraph(
            f"Showing all {total} record(s) in reverse chronological order.",
            sCaption))
        story.append(Spacer(1, 6))

        # Header row
        hdr = [
            Paragraph("#",          sTH),
            Paragraph("Text",       sTH),
            Paragraph("Sentiment",  sTH),
            Paragraph("Confidence", sTH),
            Paragraph("Date",       sTH),
        ]
        rows = [hdr]
        USABLE_W = W - LMARGIN - RMARGIN
        col_widths = [
            0.7  * cm,   # #
            9.2  * cm,   # text
            2.6  * cm,   # sentiment
            2.2  * cm,   # confidence
            3.0  * cm,   # date
        ]

        SENT_COLORS = {"Positive": GREEN, "Negative": RED, "Neutral": AMBER}

        for idx, rec in enumerate(all_records, 1):
            raw_text   = str(rec.get("text", ""))
            # Wrap at 160 chars to avoid overflow; keep full text in cell via wrapping
            cell_text  = raw_text[:300] + ("…" if len(raw_text) > 300 else "")
            sent       = rec.get("sentiment", "")
            conf_val   = rec.get("confidence") or 0
            ts         = ""
            if rec.get("created_at"):
                try:
                    ts = rec["created_at"].strftime("%d %b %Y\n%I:%M %p")
                except Exception:
                    ts = str(rec["created_at"])

            sc = SENT_COLORS.get(sent, GRAY_TXT)
            row = [
                Paragraph(str(idx),   S(f"n{idx}", fontSize=8, textColor=GRAY_TXT, alignment=TA_CENTER)),
                Paragraph(cell_text,  S(f"t{idx}", fontSize=8.5, leading=12, textColor=BLACK)),
                Paragraph(sent,       S(f"s{idx}", fontSize=9, fontName="Helvetica-Bold",
                                        textColor=sc, alignment=TA_CENTER)),
                Paragraph(f"{round(conf_val * 100)}%",
                                      S(f"c{idx}", fontSize=9, textColor=GRAY_TXT, alignment=TA_CENTER)),
                Paragraph(ts,         S(f"d{idx}", fontSize=7.5, leading=11, textColor=GRAY_TXT,
                                        alignment=TA_CENTER)),
            ]
            rows.append(row)

        tbl = Table(rows, colWidths=col_widths, repeatRows=1, splitByRow=True)
        row_bgs = []
        for i in range(1, len(rows)):
            row_bgs.append(("BACKGROUND", (0, i), (-1, i),
                            GRAY_BG if i % 2 == 1 else WHITE))
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), ORANGE),
            ("GRID",          (0, 0), (-1, -1), 0.4, GRAY_LT),
            ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
            ("ALIGN",         (1, 0), (1, -1),  "LEFT"),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (1, 0), (1, -1),  6),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [GRAY_BG, WHITE]),
        ] + row_bgs))
        story.append(tbl)
        story.append(Spacer(1, 12))

    # ══════════════════════════════════════════════════════════════════════════
    # CLOSING NOTE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(hr())
    story.append(Paragraph(
        "This report was generated automatically by SentimentAI. "
        "Results are based on a Logistic Regression classifier trained on the Twitter Sentiment dataset. "
        "Confidence scores reflect the model's predicted probability for the assigned class.",
        S("sNote", fontSize=8, textColor=GRAY_TXT, leading=12)))

    doc.build(story)


@app.route("/export-report", methods=["POST"])
def export_report():
    from io import BytesIO
    from flask import send_file

    data = request.get_json(force=True, silent=True) or {}

    # ── Auth — identify user from JWT or body ─────────────────────────────────
    jwt_email = verify_token()
    raw_email = (jwt_email if jwt_email and jwt_email != "__expired__"
                 else data.get("email", ""))
    email = sanitize_email(raw_email) if raw_email else None

    # ── Current single-analysis context ──────────────────────────────────────
    current_text = str(data.get("text", "") or "")
    current_sentiment = str(data.get("sentiment", "") or "")
    try:
        current_confidence = float(data.get("confidence", 0) or 0.0)
    except (TypeError, ValueError):
        current_confidence = 0.0

    # ── Fetch ALL history records (no limit) ──────────────────────────────────
    records = []
    if email:
        try:
            records = list(
                collection.find({"user_email": email})
                          .sort("created_at", -1)
            )
        except PyMongoError as e:
            print(f"[PDF EXPORT] DB error: {e}")
            # continue with empty records rather than crashing

    buf = BytesIO()
    try:
        _build_pdf(buf, records, current_text, current_sentiment, current_confidence, email)
    except Exception as e:
        print(f"[PDF EXPORT] Build error: {type(e).__name__}: {e}")
        buf.close()
        return err("Could not generate PDF report. Please try again.", 500)

    buf.seek(0)
    filename = f"sentimentai_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.pdf"
    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name=filename)


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, use_reloader=False)
