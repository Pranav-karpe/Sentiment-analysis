import warnings
warnings.filterwarnings("ignore")

import os
import re
import certifi
import joblib
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

# ── Tesseract path (Windows) ─────────────────────────────────────────────────
try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
except ImportError:
    pass

# ── App ───────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", os.getenv("FRONTEND_URL", "*")])

# ── JWT Config ────────────────────────────────────────────────────────────────
JWT_SECRET  = os.getenv("JWT_SECRET", "sentimentai_jwt_secret_2024")
JWT_EXPIRES = timedelta(hours=48)

def make_token(email):
    payload = {"email": email, "exp": datetime.now(timezone.utc) + JWT_EXPIRES}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token():
    """Returns email from token or None. Does NOT block guest access."""
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

# ── MongoDB Atlas (TLS fixed) ─────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://karpepranav7_db_user:JsvEebEqnbkQYuzQ@cluster0.y3oeaso.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set")

client = MongoClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())
db         = client["sentimentDB"]
users      = db["users"]
collection = db["history"]

# ── ML Model ──────────────────────────────────────────────────────────────────
model      = joblib.load("model/model.pkl")
vectorizer = joblib.load("model/vectorizer.pkl")

# ── Helpers ───────────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def ok(data, code=200):
    return jsonify(data), code

def err(msg, code=400):
    return jsonify({"error": msg}), code

def safe_hash_check(stored, password):
    """Handle both str and bytes stored passwords safely."""
    if isinstance(stored, bytes):
        stored = stored.decode("utf-8")
    return check_password_hash(stored, password)

# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.route("/signup", methods=["POST"])
def signup():
    data     = request.get_json(force=True, silent=True) or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    name     = data.get("name", "").strip()

    if not email or not password:
        return err("Email and password are required")
    if not EMAIL_RE.match(email):
        return err("Invalid email format")
    if len(password) < 6:
        return err("Password must be at least 6 characters")
    if users.find_one({"email": email}):
        return err("Email already registered", 409)

    users.insert_one({
        "name":       name,
        "email":      email,
        "password":   generate_password_hash(password),  # always str, never bytes
        "created_at": datetime.now(timezone.utc)
    })
    return ok({"message": "Account created successfully"}, 201)


@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json(force=True, silent=True) or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return err("All fields are required")
    if not EMAIL_RE.match(email):
        return err("Invalid email format")

    user = users.find_one({"email": email})
    if not user:
        return err("No account found with this email", 404)
    if not safe_hash_check(user["password"], password):
        return err("Incorrect password", 401)

    return ok({"message": "Login successful", "name": user["name"], "email": email, "token": make_token(email)})


@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data         = request.get_json(force=True, silent=True) or {}
    email        = data.get("email", "").strip().lower()
    new_password = data.get("new_password", "").strip()

    if not email or not new_password:
        return err("All fields are required")
    if len(new_password) < 6:
        return err("Password must be at least 6 characters")
    if not users.find_one({"email": email}):
        return err("No account found with this email", 404)

    users.update_one(
        {"email": email},
        {"$set": {"password": generate_password_hash(new_password)}}
    )
    return ok({"message": "Password reset successful"})


# ── Sentiment Routes ──────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    data  = request.get_json(force=True, silent=True) or {}
    text  = data.get("text", "").strip()

    # JWT email takes priority; fall back to body email for guests
    jwt_email = verify_token()
    if jwt_email == "__expired__":
        return err("Session expired. Please log in again.", 401)
    email = jwt_email or data.get("email", "").strip()

    if not text:
        return err("Text cannot be empty")

    vector     = vectorizer.transform([text])
    prediction = model.predict(vector)[0]
    proba      = model.predict_proba(vector)[0]
    confidence = round(float(max(proba)), 2)
    sentiment  = "Positive" if prediction == 1 else "Negative"

    if email:
        collection.insert_one({
            "user_email": email,
            "text":       text,
            "sentiment":  sentiment,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc)
        })

    return ok({"sentiment": sentiment, "confidence": confidence})


@app.route("/history", methods=["GET"])
def history():
    jwt_email = verify_token()
    if jwt_email == "__expired__":
        return err("Session expired. Please log in again.", 401)
    email = jwt_email or request.args.get("email", "").strip()
    if not email:
        return ok([])

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
    except Exception:
        return err("Invalid ID")


# ── Utility ───────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return "API Running 🚀"


@app.route("/reset-users", methods=["GET"])
def reset_users():
    result = users.delete_many({})
    return ok({"message": f"Deleted {result.deleted_count} users. Please signup again."})


# ── File Upload ──────────────────────────────────────────────────────────────

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
            import fitz  # pymupdf
            doc  = fitz.open(stream=f.read(), filetype="pdf")
            text = " ".join(page.get_text() for page in doc).strip()

        elif name.endswith((".jpg", ".jpeg", ".png")):
            import pytesseract
            from PIL import Image
            import io
            img  = Image.open(io.BytesIO(f.read()))
            text = pytesseract.image_to_string(img).strip()

        else:
            return err("Unsupported file type. Use .txt, .pdf, .jpg, or .png")

    except Exception as e:
        return err(f"Could not read file: {str(e)}")

    if not text:
        return err("No text found in file")

    vector     = vectorizer.transform([text])
    prediction = model.predict(vector)[0]
    proba      = model.predict_proba(vector)[0]
    confidence = round(float(max(proba)), 2)
    sentiment  = "Positive" if prediction == 1 else "Negative"

    jwt_email = verify_token()
    email     = (jwt_email if jwt_email and jwt_email != "__expired__"
                 else request.form.get("email", "").strip())
    if email:
        collection.insert_one({
            "user_email": email,
            "text":       text[:500],
            "sentiment":  sentiment,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc)
        })
    return ok({"sentiment": sentiment, "confidence": confidence, "text": text[:300]})


# ── PDF Export ────────────────────────────────────────────────────────────────

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

    buf    = BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    # Title
    story.append(Paragraph("SentimentAI — Analysis Report", ParagraphStyle("title", fontSize=20, fontName="Helvetica-Bold", textColor=colors.HexColor("#f97316"), spaceAfter=6)))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p UTC')}", ParagraphStyle("sub", fontSize=9, textColor=colors.grey, spaceAfter=20)))

    # Result
    story.append(Paragraph("Sentiment Result", ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
    result_color = colors.HexColor("#22c55e") if sentiment == "Positive" else colors.HexColor("#ef4444")
    story.append(Paragraph(f"<font color='#{('22c55e' if sentiment == 'Positive' else 'ef4444')}'>{sentiment}</font>  —  {int(confidence*100)}% confident",
        ParagraphStyle("result", fontSize=14, fontName="Helvetica-Bold", spaceAfter=16)))

    # Input text
    story.append(Paragraph("Analyzed Text", ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
    story.append(Paragraph(text[:1000], ParagraphStyle("body", fontSize=10, leading=14, spaceAfter=20)))

    # History summary table
    if pos + neg > 0:
        story.append(Paragraph("Session Summary", ParagraphStyle("h2", fontSize=13, fontName="Helvetica-Bold", spaceAfter=8)))
        table = Table([["Sentiment", "Count", "Percentage"],
                       ["Positive", str(pos), f"{round(pos/(pos+neg)*100)}%"],
                       ["Negative", str(neg), f"{round(neg/(pos+neg)*100)}%"],
                       ["Total",    str(pos+neg), "100%"]],
                      colWidths=[6*cm, 4*cm, 4*cm])
        table.setStyle(TableStyle([
            ("BACKGROUND",  (0,0), (-1,0), colors.HexColor("#f97316")),
            ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
            ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0), (-1,-1), 10),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f9fafb"), colors.white]),
            ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
            ("ALIGN",       (1,0), (-1,-1), "CENTER"),
            ("TOPPADDING",  (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 16))

    story.append(Paragraph("Powered by SentimentAI · Logistic Regression + TF-IDF",
        ParagraphStyle("footer", fontSize=8, textColor=colors.grey)))

    doc.build(story)
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name="sentiment_report.pdf")


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
