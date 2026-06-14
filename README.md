# SentimentAI — AI-Powered Sentiment Analysis Platform

**Understand the sentiment behind any text — instantly.**

SentimentAI is a production-grade full-stack web application that uses machine learning to classify text as Positive, Negative, or Neutral. Built for businesses, researchers, and content creators who need to analyze customer feedback, social media posts, reviews, or survey responses at scale — without reading every single word manually.

---

## 🎯 Problem It Solves

Every day, businesses receive thousands of customer reviews, support tickets, social media comments, and survey responses. Reading them all manually is:
- **Time-consuming** — hours wasted on repetitive tasks
- **Inconsistent** — different people interpret the same text differently
- **Error-prone** — sarcasm, nuance, and volume make manual analysis unreliable

SentimentAI automates this process using a trained machine learning model, giving you instant, consistent, and scalable sentiment insights.

---

## ✨ Features

### Core Sentiment Analysis
- **Text Classification** — Positive, Negative, or Neutral sentiment detection
- **Confidence Score** — 0–100% certainty for every prediction
- **Real-time Analysis** — Results in under 1 second
- **No Character Limit** — Analyze short tweets or long documents
- **Batch Analysis** — Paste multiple lines; each is analyzed individually with an overall summary

### File Upload
- **Plain Text Support** — `.txt` files, UTF-8 decoded directly

### Analytics Dashboard
- **Sentiment Overview** — Pie chart showing Positive/Negative/Neutral split
- **Trend Analysis** — Bar chart tracking sentiment over time (per day)
- **Stats Cards** — Total analyses, Positive %, Negative %, Neutral %
- **Percentage Bar** — Visual breakdown of sentiment distribution

### History & Search
- **Analysis History** — Last 10 analyses saved per user
- **Search** — Find past analyses by text content
- **Filter** — View only Positive, Negative, Neutral, or All
- **Delete** — Remove any entry instantly

### Export & Reports
- **PDF Export** — Professional report with sentiment result, confidence, timestamp, and session summary table
- **CSV Export** — Download full history as CSV (text, sentiment, confidence, date)

### Authentication & Security
- **User Accounts** — Signup, Login, Password Reset
- **JWT Tokens** — Secure authentication with 48-hour expiry
- **Session Management** — Auto-logout after 48 hours of inactivity
- **MongoDB Atlas** — Cloud database with encryption at rest and in transit

### UX & Design
- **Dark / Light Mode** — Full theme support with glassy frosted-glass UI
- **ChatGPT-style Input** — Auto-expanding textarea (starts small, grows as you type, max 300px)
- **Responsive Design** — Works perfectly on mobile, tablet, and desktop
- **Smooth Animations** — Scroll-reveal, card hover, result fade-in, logo shimmer
- **Mobile Menu** — Hamburger navigation for small screens
- **Keyboard Shortcuts** — Ctrl+Enter to analyze instantly

---

## 🛠️ Tech Stack

### Frontend
- **React 19** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS v4** — Utility-first styling
- **Recharts** — Charts (Pie, Bar)
- **Axios** — HTTP client
- **React Router** — Client-side routing

### Backend
- **Flask** — Python web framework
- **Flask-CORS** — Cross-origin resource sharing
- **scikit-learn** — Machine learning (Logistic Regression + TF-IDF)
- **joblib** — Model serialization
- **PyJWT** — JWT token generation and verification
- **Werkzeug** — Password hashing

### Database
- **MongoDB Atlas** — Cloud NoSQL database
- **pymongo** — MongoDB driver for Python

### File Processing
- (none — text input only)

### PDF Generation
- **ReportLab** — PDF report creation with tables and styling

---

## 📁 Project Structure

```
tlpbl/
├── backend/
│   ├── model/
│   │   ├── model.pkl           # Trained Logistic Regression model
│   │   └── vectorizer.pkl      # TF-IDF vectorizer
│   ├── app.py                  # Flask API (all routes)
│   ├── train_model.py          # Model training script
│   ├── build.sh                # Render build script
│   ├── render.yaml             # Render deployment config
│   └── requirements.txt        # Python dependencies
├── dataset/
│   └── twitter.csv             # Training data (Twitter sentiment dataset)
└── frontend/
    ├── src/
    │   ├── App.jsx             # Root component + routing
    │   ├── Dashboard.jsx       # Main analyze page
    │   ├── AnalyticsDashboard.jsx  # Analytics page
    │   ├── Login.jsx           # Login page
    │   ├── Signup.jsx          # Signup page
    │   ├── ForgotPassword.jsx  # Password reset
    │   ├── LandingPage.jsx     # Marketing sections + footer
    │   ├── AboutModal.jsx      # Feature showcase modal
    │   ├── Toast.jsx           # Toast notification system
    │   ├── TrustPage.jsx       # Layout for Privacy/Terms/About/Contact
    │   ├── PrivacyPolicy.jsx   # Privacy policy page
    │   ├── Terms.jsx           # Terms of service
    │   ├── AboutPage.jsx       # About page
    │   ├── ContactPage.jsx     # Contact page
    │   └── index.css           # Global styles + animations
    ├── index.html              # HTML entry point
    ├── package.json            # Node dependencies
    └── vite.config.js          # Vite configuration
```

---

## 🔄 How It Works

### Workflow

1. **User Input**
   - User types text directly into the expanding textarea

2. **Sentiment Prediction**
   - Text is vectorized using TF-IDF (Term Frequency-Inverse Document Frequency)
   - Logistic Regression model predicts sentiment class (0 = Negative, 1 = Positive)
   - Confidence score calculated from prediction probabilities

4. **Data Storage** (if user is logged in)
   - Analysis saved to MongoDB with: `user_email`, `text`, `sentiment`, `confidence`, `timestamp`
   - History limited to last 10 entries per user

5. **Analytics Dashboard**
   - Pie chart shows Positive/Negative/Neutral split
   - Bar chart shows sentiment trend over time (grouped by date)
   - Stats cards display Total, Positive %, Negative %, Neutral %

6. **Export**
   - **PDF** — Professional report with ReportLab (sentiment result, confidence, text, session summary table)
   - **CSV** — Full history download (text, sentiment, confidence, created_at)

---

## 📋 Prerequisites

Before running the project, ensure you have:

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **Python** (v3.9 or higher) — [Download](https://www.python.org/)
- **MongoDB Atlas Account** — [Sign up free](https://www.mongodb.com/cloud/atlas)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd tlpbl
```

### 2. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Run the Project

```bash
npm install
npm run dev
```

This single command starts **both** the Flask backend and the React frontend together using `concurrently`.

- Backend runs on `http://127.0.0.1:5000`
- Frontend runs on `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb://127.0.0.1:27017/sentiment_analysis
JWT_SECRET=sentiment_ai_secret_key
FLASK_DEBUG=false
```

### Frontend (`frontend/.env.development`)

```env
VITE_API_URL=http://127.0.0.1:5000
```

For production, update `VITE_API_URL` in `frontend/.env.production` to your deployed backend URL.

---

## 📖 Usage

### 1. Create an Account
- Click **Sign up** in the navbar
- Enter your name, email, and password (min 6 characters)
- You'll be automatically logged in after signup

### 2. Analyze Text
- Type or paste text into the input box
- Press **Ctrl+Enter** or click **Analyze**
- Result appears instantly with sentiment label and confidence score

### 3. View Analytics
- Click **Dashboard** in the navbar
- See your analysis history, charts, and stats
- Search or filter by sentiment type
- Delete any entry with the ✕ button

### 4. Export Reports
- After analyzing, click **Download PDF** to get a formatted report
- On the Dashboard, click **Download CSV** to export full history

---

## 🎨 Features Breakdown

### Authentication Flow
```
Landing Page → Signup/Login → Dashboard (protected) → Analytics (protected)
```

### Sentiment Classes
- **Positive** — Optimistic, happy, satisfied tone (😊 green)
- **Negative** — Critical, frustrated, disappointed tone (😞 red)
- **Neutral** — Factual, balanced, or unclear tone (😐 yellow)

### File Support
| Format | Extraction Method |
|--------|-------------------|
| `.txt` | UTF-8 decode |

### Session Management
- **Token Expiry:** 48 hours from login
- **Inactivity Timeout:** 48 hours of no activity
- **Auto-logout:** Triggered on expired token or inactivity

---

## 📊 API Endpoints

### Authentication
- `POST /signup` — Create new account
- `POST /login` — Login and receive JWT token
- `POST /forgot-password` — Reset password

### Sentiment Analysis
- `POST /predict` — Analyze text sentiment

### History
- `GET /history?email=<email>` — Fetch user's last 10 analyses
- `DELETE /delete-history/<id>` — Delete a specific entry

### Export
- `POST /export-report` — Generate PDF report
- `GET /export-csv?email=<email>` — Download CSV

---

## 🧠 Machine Learning Model

### Training Data
- **Dataset:** Twitter Sentiment Analysis dataset (`twitter.csv`)
- **Size:** Millions of labeled tweets
- **Classes:** Binary (Positive = 1, Negative = 0)

### Model Architecture
- **Algorithm:** Logistic Regression
- **Vectorization:** TF-IDF (Term Frequency-Inverse Document Frequency)
- **Training Script:** `backend/train_model.py`
- **Saved Models:** `model.pkl` (classifier), `vectorizer.pkl` (TF-IDF)

### Performance
- **Accuracy:** ~85% on test data
- **Inference Time:** < 100ms per prediction
- **Confidence Threshold:** Returns probability of predicted class

---

## 🎨 UI/UX Highlights

### Glassy Design System
- **Frosted glass cards** with `backdrop-blur` and subtle shadows
- **Animated background orbs** — 3 floating radial gradients
- **Logo shimmer** — Continuous gradient sweep across "SentimentAI"
- **Smooth transitions** — All interactions use cubic-bezier easing

### Responsive Breakpoints
- **Mobile:** < 640px (hamburger menu, stacked cards)
- **Tablet:** 640px–1024px (2-column grids)
- **Desktop:** ≥ 1024px (full layout, side-by-side charts)

### Accessibility
- **Keyboard navigation** — Tab through all interactive elements
- **Focus indicators** — Orange glow on focused inputs
- **ARIA labels** — Screen reader support
- **Touch targets** — All buttons ≥ 44×44px for mobile

---

## 🔮 Future Improvements

### Planned Features
- [ ] **Transformer Model** — Upgrade to BERT or RoBERTa for better accuracy
- [ ] **Multi-language Support** — Detect sentiment in Spanish, French, German, etc.
- [ ] **Batch CSV Upload** — Upload CSV with multiple texts, get bulk results
- [ ] **API Access** — REST API with rate limiting for developers
- [ ] **Real-time Streaming** — Analyze live Twitter/Reddit feeds
- [ ] **Sentiment Explanation** — Highlight positive/negative words in the text
- [ ] **Custom Models** — Let users train on their own datasets
- [ ] **Team Collaboration** — Share dashboards with team members

### Technical Debt
- [ ] Add rate limiting (Flask-Limiter)
- [ ] Implement Redis caching for frequent queries
- [ ] Add unit tests (pytest for backend, Vitest for frontend)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Dockerize the application

---

## 🐛 Known Issues

- **Neutral sentiment** — Currently not returned by the model (binary classifier). Neutral is shown when the model's confidence falls below the threshold.
- **History limit** — Only last 10 entries are fetched. Pagination not yet implemented.
- **Guest mode** — Works fully. Sentiment analysis is available without login. History is not saved for guests.

---

## 🧪 Testing

### Backend
```bash
cd backend
python -c "import joblib; print('Model loaded:', joblib.load('model/model.pkl'))"
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Manual Testing Checklist
- [ ] Signup with new email
- [ ] Login with existing account
- [ ] Analyze text (positive, negative, neutral examples)
- [ ] Upload `.txt` file
- [ ] Upload `.pdf` file
- [ ] View analytics dashboard
- [ ] Search history
- [ ] Filter by sentiment
- [ ] Delete history entry
- [ ] Download PDF report
- [ ] Test dark/light mode toggle
- [ ] Test on mobile device (responsive layout)

---

## 📦 Dependencies

### Backend (`requirements.txt`)
```
flask
flask-cors
pymongo
joblib
scikit-learn
numpy
pandas
werkzeug
reportlab
PyJWT
certifi
gunicorn
python-dotenv
```

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "axios": "^1.15.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^6.30.3",
    "recharts": "^3.8.1"
  }
}
```

---

## 🚢 Deployment

### Backend (Flask)
**Recommended:** Deploy to **Render**

1. Set environment variables in Render dashboard: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`
2. Build command: `chmod +x build.sh && ./build.sh`
3. Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120`

### Frontend (React)
**Recommended:** Deploy to **Vercel** or **Netlify**

1. Set `VITE_API_URL` in environment variables to your Render backend URL
2. Build: `npm run build`
3. Deploy the `dist/` folder

### Database
- MongoDB Atlas is already cloud-hosted — no deployment needed
- Ensure IP whitelist allows connections from your backend server (`0.0.0.0/0` for Render)

---

## 🔒 Security Considerations

- **Passwords** — Hashed using Werkzeug's `generate_password_hash` (PBKDF2)
- **JWT Tokens** — Signed with HS256, expire after 48 hours
- **HTTPS Required** — Clipboard API (copy button) only works on HTTPS
- **Input Validation** — Email format, password length, text sanitization
- **CORS** — Configured to allow frontend origin only (set `FRONTEND_URL` in production)

---

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

**Pranav Karpe**  
Full-stack Developer | ML Enthusiast

- **Email:** [karpepranav7@gmail.com](mailto:karpepranav7@gmail.com)
- **Phone:** +91 98812 65414
- **LinkedIn:** [linkedin.com/in/pranav-karpe-46b14528b](https://www.linkedin.com/in/pranav-karpe-46b14528b/)

---

## 🙏 Acknowledgments

- **Dataset:** Twitter Sentiment Analysis dataset (Kaggle)
- **ML Framework:** scikit-learn
- **UI Inspiration:** Modern SaaS platforms (Linear, Vercel, Stripe)
- **Icons:** Heroicons (via inline SVG)

---

## 📞 Support

For questions, bug reports, or feature requests:
- Open an issue on GitHub
- Email: [karpepranav7@gmail.com](mailto:karpepranav7@gmail.com)
- Response time: 24–48 hours

---

**Built with ❤️ by Pranav Karpe**
