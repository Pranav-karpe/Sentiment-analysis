import pandas as pd
import re
import nltk
import joblib

from nltk.corpus import stopwords
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Download stopwords (first time only)
nltk.download('stopwords')

print("📥 Loading dataset...")

# Load dataset
df = pd.read_csv(
    "../dataset/twitter.csv",
    encoding='latin-1',
    header=None,
    names=['target', 'id', 'date', 'flag', 'user', 'text']
)

# Keep only required columns
df = df[['target', 'text']]

# Convert labels (0 = negative, 4 = positive)
df['target'] = df['target'].apply(lambda x: 1 if x == 4 else 0)

# 🔥 Take sample (fast + good accuracy)
df = df.sample(n=100000, random_state=42)

print("🧹 Cleaning text...")

# Text cleaning
def clean_text(text):
    text = str(text)

    # handle negation
    text = re.sub(r"n't", " not", text)

    # remove noise
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)

    text = text.lower()
    return text

df['text'] = df['text'].apply(clean_text)

# Remove stopwords BUT KEEP negations
stop_words = set(stopwords.words('english')) - {"not", "no", "nor"}

df['text'] = df['text'].apply(
    lambda x: ' '.join([word for word in x.split() if word not in stop_words])
)

print("✂️ Splitting data...")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    df['text'], df['target'], test_size=0.2, random_state=42
)

print("🔢 Vectorizing text...")

# 🔥 Advanced TF-IDF (better context)
vectorizer = TfidfVectorizer(
    max_features=10000,
    ngram_range=(1, 3)
)

X_train_vec = vectorizer.fit_transform(X_train)

print("🤖 Training model...")

# Model
model = LogisticRegression(max_iter=400)
model.fit(X_train_vec, y_train)

print("💾 Saving model...")

# Save files
joblib.dump(model, "model/model.pkl")
joblib.dump(vectorizer, "model/vectorizer.pkl")

print("✅ FINAL MODEL READY 🚀")