from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
import os
from flask import request, jsonify

API_KEY = os.getenv("PRODUCTINSIGHT_API_KEY", "")  

def is_authorized(req):
    if API_KEY == "":
        return True  
    auth = (req.headers.get("Authorization") or "").strip()
    return auth == API_KEY or auth == f"Bearer {API_KEY}"

app = Flask(__name__)
CORS(app)

EXPECTED_API_KEY = os.environ.get("PRODUCTINSIGHT_API_KEY", "sk-prod-8821-xxxx-xxxx")

product_data = [
  {"date": "2024-01-01", "mrr": 45000, "dau": 10500, "churn": 2.1, "orders": 850},
  {"date": "2024-02-01", "mrr": 47200, "dau": 11200, "churn": 2.0, "orders": 920},
  {"date": "2024-03-01", "mrr": 46800, "dau": 11800, "churn": 2.3, "orders": 890},
  {"date": "2024-04-01", "mrr": 49500, "dau": 12500, "churn": 1.9, "orders": 980},
  {"date": "2024-05-01", "mrr": 52000, "dau": 13100, "churn": 1.8, "orders": 1050},
  {"date": "2024-06-01", "mrr": 51500, "dau": 13400, "churn": 2.0, "orders": 1020},
  {"date": "2024-07-01", "mrr": 54000, "dau": 14200, "churn": 1.7, "orders": 1100},
  {"date": "2024-08-01", "mrr": 58000, "dau": 15000, "churn": 1.6, "orders": 1250},
  {"date": "2024-09-01", "mrr": 62000, "dau": 16500, "churn": 1.5, "orders": 1340},
  {"date": "2024-10-01", "mrr": 61000, "dau": 16200, "churn": 1.8, "orders": 1300},
  {"date": "2024-11-01", "mrr": 65000, "dau": 17800, "churn": 1.4, "orders": 1450},
  {"date": "2024-12-01", "mrr": 72000, "dau": 19000, "churn": 1.2, "orders": 1600},
]

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "up", "service": "ProductInsight Backend"})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    auth = request.headers.get('Authorization', '')
    if auth.startswith("Bearer "):
        auth = auth.replace("Bearer ", "", 1)

    if not is_authorized(request):
        return jsonify({"error": "Unauthorized"}), 401


    current_mrr = 72000 + random.randint(-500, 1000)

    return jsonify({
        "data": product_data,
        "live_snapshot": {
            "current_mrr": current_mrr,
            "server_time": time.time()
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
