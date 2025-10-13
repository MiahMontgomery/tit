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
        'project': '0d5e630e-d302-4f92-b4ef-f1645b372a43'
    })

@app.route('/api/projects', methods=['GET'])
def get_projects():
    return jsonify({
        'message': 'Projects API endpoint',
        'project': '0d5e630e-d302-4f92-b4ef-f1645b372a43',
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