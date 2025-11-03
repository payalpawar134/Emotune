from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config.database import init_database
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# ====================
# IMPORTANT: CORS Configuration - Fix the preflight issue
# ====================
CORS(app, 
     resources={
         r"/api/*": {
             "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "expose_headers": ["Content-Type", "Authorization"]
         }
     })

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Or set to a timedelta

jwt = JWTManager(app)

# Initialize database
with app.app_context():
    init_database()

# Register blueprints with correct paths
from backend.routes import auth_routes, emotion_routes, music_routes, profile_routes

app.register_blueprint(auth_routes.bp, url_prefix='/api/auth')
app.register_blueprint(emotion_routes.bp, url_prefix='/api/emotion')
app.register_blueprint(music_routes.bp, url_prefix='/api/music')
app.register_blueprint(profile_routes.bp, url_prefix='/api/profile')

# ====================
# CRITICAL: Handle OPTIONS requests (Preflight)
# ====================
@app.before_request
def handle_preflight():
    from flask import request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

# Error handlers
@app.errorhandler(404)
def not_found(error):
    from flask import jsonify
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    from flask import jsonify
    return jsonify({'error': 'Internal server error'}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    from flask import jsonify
    return jsonify({'status': 'ok', 'message': 'API is running'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)