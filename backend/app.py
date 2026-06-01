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

# ── Load .env ───────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    # fallback: manual .env parse (no python-dotenv installed)
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.isfile(_env_path):
        with open(_env_path) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ[_k.strip()] = _v.strip()

# ── Tesseract — auto-detect; env var overrides; Windows fallback ──────────────
try:
    import pytesseract
    _tess_env = os.getenv("TESSERACT_CMD")
    if _tess_env:
        pytesseract.pytesseract.tesseract_cmd = _tess_env
    elif os.name == "nt":
        _win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.isfile(_win_path):
            pytesseract.pytesseract.tesseract_cmd = _win_path
except ImportError:
    pass

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
    MONGO_URI = "mongodb://127.0.0.1:27017/sentiment_analysis"

# Connect with TLS only if it is an Atlas connection (i.e. starts with mongodb+srv or contains tls/ssl params, or isn't localhost)
is_atlas = MONGO_URI.startswith("mongodb+srv://") or "replicaSet" in MONGO_URI or "mongodb.net" in MONGO_URI

mongo_kwargs = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 5000,
    "socketTimeoutMS": 5000
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

def db_err(e):
    """Convert any PyMongoError into a clean JSON 503 response."""
    print(f"[DB ERROR] {type(e).__name__}: {e}")
    if isinstance(e, OperationFailure) and "auth" in str(e).lower():
        return err(
            "Database authentication failed. "
            "Open backend/.env and make sure MONGO_URI has the correct username and password.",
            503
        )
    if isinstance(e, ServerSelectionTimeoutError):
        return err(
            "Cannot reach the database. "
            "Check your internet connection and MongoDB Atlas IP whitelist (add 0.0.0.0/0 for local dev).",
            503
        )
    return err("Database error. Please try again later.", 503)

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
        return db_err(e)

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
        return db_err(e)

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
        return db_err(e)

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
        return db_err(e)

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
        return db_err(e)

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
        return db_err(e)

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
        return db_err(e)
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
        return db_err(e)
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
            import pytesseract
            from PIL import Image
            import io
            img_bytes = io.BytesIO(f.read())
            try:
                img  = Image.open(img_bytes)
                text = pytesseract.image_to_string(img).strip()
            finally:
                img_bytes.close()

        else:
            return err("Unsupported file type. Use .txt, .pdf, .jpg, or .png")

    except Exception as e:
        return err(f"Could not read file: {str(e)}")

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

@app.route("/export-report", methods=["POST"])
def export_report():
    from io import BytesIO
    from flask import send_file
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    data       = request.get_json(force=True, silent=True) or {}
    text       = data.get("text", "N/A")
    sentiment  = data.get("sentiment", "N/A")
    confidence = data.get("confidence", 0)
    pos        = data.get("positive_count", 0)
    neg        = data.get("negative_count", 0)

    buf = BytesIO()
    try:
        doc   = SimpleDocTemplate(buf, pagesize=A4,
                                   leftMargin=2*cm, rightMargin=2*cm,
                                   topMargin=2*cm, bottomMargin=2*cm)
        story = []

        story.append(Paragraph("SentimentAI — Analysis Report",
            ParagraphStyle("title", fontSize=20, fontName="Helvetica-Bold",
                           textColor=colors.HexColor("#f97316"), spaceAfter=6)))
        story.append(Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p UTC')}",
            ParagraphStyle("sub", fontSize=9, textColor=colors.grey, spaceAfter=20)))
        story.append(Paragraph("Sentiment Result",
            ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
        story.append(Paragraph(
            f"<font color='#{('22c55e' if sentiment == 'Positive' else 'ef4444')}'>"
            f"{sentiment}</font>  —  {int(confidence*100)}% confident",
            ParagraphStyle("result", fontSize=14, fontName="Helvetica-Bold", spaceAfter=16)))
        story.append(Paragraph("Analyzed Text",
            ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
        story.append(Paragraph(text[:1000],
            ParagraphStyle("body", fontSize=10, leading=14, spaceAfter=20)))

        if pos + neg > 0:
            story.append(Paragraph("Session Summary",
                ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
            table = Table(
                [["Sentiment", "Count", "Percentage"],
                 ["Positive", str(pos), f"{round(pos/(pos+neg)*100)}%"],
                 ["Negative", str(neg), f"{round(neg/(pos+neg)*100)}%"],
                 ["Total",    str(pos+neg), "100%"]],
                colWidths=[6*cm, 4*cm, 4*cm])
            table.setStyle(TableStyle([
                ("BACKGROUND",     (0,0), (-1,0), colors.HexColor("#f97316")),
                ("TEXTCOLOR",      (0,0), (-1,0), colors.white),
                ("FONTNAME",       (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",       (0,0), (-1,-1), 10),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f9fafb"), colors.white]),
                ("GRID",           (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
                ("ALIGN",          (1,0), (-1,-1), "CENTER"),
                ("TOPPADDING",     (0,0), (-1,-1), 6),
                ("BOTTOMPADDING",  (0,0), (-1,-1), 6),
            ]))
            story.append(table)
            story.append(Spacer(1, 16))

        story.append(Paragraph("Powered by SentimentAI · Logistic Regression + TF-IDF",
            ParagraphStyle("footer", fontSize=8, textColor=colors.grey)))

        doc.build(story)
    except Exception:
        buf.close()
        raise
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name="sentiment_report.pdf")


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, use_reloader=False)
