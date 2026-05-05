import pandas as pd
import re
import nltk
import joblib

from nltk.corpus import stopwords
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, classification_report

nltk.download("stopwords", quiet=True)

print("Loading dataset...")

df = pd.read_csv(
    "../dataset/twitter.csv",
    encoding="latin-1",
    header=None,
    names=["target", "id", "date", "flag", "user", "text"]
)

df = df[["target", "text"]]
df["target"] = df["target"].apply(lambda x: 1 if x == 4 else 0)
df = df.sample(n=100000, random_state=42)

print("Cleaning text...")

# Negation patterns — join negation word with next word so "not good" → "not_good"
NEGATION_RE = re.compile(
    r"\b(not|no|never|neither|nor|cannot|can't|won't|don't|doesn't|didn't|isn't|wasn't|aren't|weren't|haven't|hasn't|hadn't|shouldn't|wouldn't|couldn't)\s+(\w+)",
    re.IGNORECASE
)

def clean_text(text):
    text = str(text).lower()
    # expand contractions before removing punctuation
    text = re.sub(r"n't", " not", text)
    text = re.sub(r"'re", " are", text)
    text = re.sub(r"'ve", " have", text)
    text = re.sub(r"'ll", " will", text)
    text = re.sub(r"'d",  " would", text)
    # remove URLs and mentions
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    # negation binding: "not good" → "not_good"
    text = NEGATION_RE.sub(lambda m: m.group(1) + "_" + m.group(2), text)
    # remove non-alpha (keep underscores from negation binding)
    text = re.sub(r"[^a-z\s_]", "", text)
    return text.strip()

df["text"] = df["text"].apply(clean_text)

# Keep negation words — do NOT remove them
stop_words = set(stopwords.words("english")) - {
    "not", "no", "nor", "never", "neither",
    "but", "however", "although", "though"
}

df["text"] = df["text"].apply(
    lambda x: " ".join([w for w in x.split() if w not in stop_words])
)

print("Splitting data...")

X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["target"], test_size=0.2, random_state=42
)

print("Vectorizing text...")

# Bigrams capture "not_good", "just_love", "oh_great" patterns
vectorizer = TfidfVectorizer(
    max_features=50000,
    ngram_range=(1, 2),
    sublinear_tf=True,       # dampens high-frequency terms
    min_df=3,                # ignore very rare terms
    strip_accents="unicode"
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

print("Training model (LinearSVC + Calibration)...")

# LinearSVC is faster and more accurate than LogisticRegression for text
# CalibratedClassifierCV wraps it to give probability scores (needed for confidence)
svc   = LinearSVC(C=1.0, max_iter=2000)
model = CalibratedClassifierCV(svc, cv=3)
model.fit(X_train_vec, y_train)

print("Evaluating...")

y_pred = model.predict(X_test_vec)
acc    = accuracy_score(y_test, y_pred)
print(f"Accuracy: {acc:.4f} ({acc*100:.2f}%)")
print(classification_report(y_test, y_pred, target_names=["Negative", "Positive"]))

print("Saving model...")

joblib.dump(model,      "model/model.pkl")
joblib.dump(vectorizer, "model/vectorizer.pkl")

print("UPGRADED MODEL READY")
