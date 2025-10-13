from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'project': 'acc4aa53-0435-4c50-b4fd-92bc81f3c495'
    })

@app.route('/api/projects', methods=['GET'])
def get_projects():
    return jsonify({
        'message': 'Projects API endpoint',
        'project': 'acc4aa53-0435-4c50-b4fd-92bc81f3c495',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    return jsonify({
        'message': 'Project created',
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)