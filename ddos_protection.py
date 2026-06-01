from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
limiter = Limiter(app, key_func=get_remote_address)

# Allow only authenticated access
AUTHORIZED_KEYS = ["YOUR_SECURE_API_KEY"]

@app.route('/secure-endpoint', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limit to 5 requests per minute
def secure_endpoint():
    api_key = request.headers.get('Authorization')
    if api_key not in AUTHORIZED_KEYS:
        return jsonify({"error": "Unauthorized access"}), 403

    # Example input validation for preventing harmful requests
    data = request.json or {}
    if "malicious_payload" in data.get('command', ''):
        return jsonify({"error": "Invalid input detected"}), 400

    # Process the legitimate request here
    return jsonify({"status": "Safe request processed"}), 200


if __name__ == '__main__':
    app.run(debug=True)