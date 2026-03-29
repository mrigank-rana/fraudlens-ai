# 🛡️ FraudLens AI: Real-Time Explainable Fraud Detection

FraudLens AI is an enterprise-grade, real-time transaction monitoring dashboard designed to detect, explain, and neutralize "invisible fraud" patterns in under 200ms. 

Unlike traditional rule-based engines, FraudLens utilizes unsupervised machine learning to detect anomalous behavioral velocity and multi-hop network connections, providing analysts with actionable, human-readable intelligence.

![FraudLens Dashboard Placeholder](link-to-your-screenshot-here.png)

## ⚡ Core Features

* **Sub-200ms Streaming Engine:** Built with Socket.io to process and visualize live transaction streams instantly.
* **Explainable AI (XAI):** Integrated SHAP (SHapley Additive exPlanations) values to break down the exact mathematical reasons behind a high-risk score, ensuring regulatory compliance and analyst trust.
* **Multi-Hop Fingerprinting:** Graph-based visual analysis mapping the target transaction to historical safe nodes and known bad actors.
* **Actionable Command Center:** Analysts can instantly neutralize threats via real-time **Block** actions or tag suspicious micro-transactions for **Supervision**, all tracked in a secure Action Log.

## 🛠️ Technical Architecture

This project utilizes a microservices architecture to separate the intense ML inference from the real-time web socket streaming.

* **Frontend Interface:** React.js, Vite, Tailwind CSS, Recharts, Framer Motion (State Management via React Query).
* **Streaming Backend:** Node.js, Express, Socket.io.
* **Database:** MongoDB (for historical transaction logs and action states).
* **Machine Learning API:** Python, FastAPI, Scikit-Learn (Isolation Forest algorithm).

## 🚀 Local Setup & Installation

To run this project locally, you will need Node.js, Python 3.10+, and MongoDB installed.

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/yourusername/fraudlens-ai.git
cd fraudlens-ai
\`\`\`

### 2. Start the ML Engine (Terminal 1)
\`\`\`bash
cd ml-api
pip install -r requirements.text
uvicorn app:app --reload --port 8000
\`\`\`

### 3. Start the Streaming Backend (Terminal 2)
*Ensure MongoDB is running locally on port 27017.*
\`\`\`bash
cd backend
npm install
node server.js
\`\`\`

### 4. Start the Frontend Interface (Terminal 3)
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
*Navigate to `http://localhost:5173` to view the dashboard.*

---
*Built during the 2026 Hackathon.*