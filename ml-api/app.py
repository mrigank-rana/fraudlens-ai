from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import shap
import time

app = FastAPI()

print("Loading PaySim dataset and engineering features...")
start_time = time.time()

# 1. Load a 50k sample of the real PaySim dataset
try:
    df_raw = pd.read_csv('paysim.csv').sample(n=50000, random_state=42)
except FileNotFoundError:
    print("ERROR: paysim.csv not found. Please ensure it is in the ml-api folder.")
    exit()

# 2. Feature Engineering: Map PaySim columns and add synthetic features for the MVP
X_train = pd.DataFrame({
    'amount': df_raw['amount'],
    # Simulating the features promised in your pitch deck
    'time_delta_mins': np.random.uniform(0, 1440, 50000),
    'velocity_1hr': np.random.randint(1, 10, 50000),
    'location_mismatch': np.random.choice([0, 1], 50000, p=[0.95, 0.05])
})

print(f"Data prepped in {round(time.time() - start_time, 2)} seconds. Training Isolation Forest...")

# 3. Train the model
model = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1) # n_jobs=-1 uses all CPU cores
model.fit(X_train)

# 4. Initialize SHAP Explainer
explainer = shap.TreeExplainer(model)
print("Model Ready! API is live.")

# 5. Define incoming transaction structure
class Transaction(BaseModel):
    txn_id: str
    amount: float
    time_delta_mins: float
    velocity_1hr: int
    location_mismatch: int

# 6. Prediction Endpoint
@app.post("/predict")
def predict_fraud(txn: Transaction):
    df = pd.DataFrame([txn.dict()]).drop(columns=['txn_id'])
    
    # Get Anomaly Score 
    anomaly_score = model.decision_function(df)[0]
    
    # Scale to 0-100 Risk Score
    risk_score = min(max(int((0.5 - anomaly_score) * 100), 0), 100)
    
    # Flagging Logic
    if risk_score > 75: flag = "HIGH"
    elif risk_score > 40: flag = "MEDIUM"
    else: flag = "LOW"
    
    # SHAP Explanations
    shap_values = explainer.shap_values(df)
    
    explanations = [
        {"feature": "Amount", "value": round(float(shap_values[0][0]), 3)},
        {"feature": "Time Delta", "value": round(float(shap_values[0][1]), 3)},
        {"feature": "Velocity", "value": round(float(shap_values[0][2]), 3)},
        {"feature": "Location", "value": round(float(shap_values[0][3]), 3)}
    ]
    
    return {
        "txn_id": txn.txn_id,
        "amount": txn.amount,
        "risk_score": risk_score,
        "flag": flag,
        "explanations": explanations
    }