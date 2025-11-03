from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import re
from backend.config.database import get_db_connection

bp = Blueprint('auth', __name__)

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, "Valid"

@bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(k in data for k in ['name', 'email', 'password']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate email
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password
        is_valid, msg = validate_password(password)
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        # Check if user exists
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password and create user
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        connection.commit()
        user_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        # Create access token
        access_token = create_access_token(identity=str(user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            },
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Get user from database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, name, email, password FROM users WHERE email = %s",
            (email,)
        )
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password'], password):
            cursor.close()
            connection.close()
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Log session
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')
        
        cursor.execute(
            "INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES (%s, %s, %s)",
            (user['id'], ip_address, user_agent)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        # Create access token
        access_token = create_access_token(identity=str(user['id']))
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email']
            },
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user"""
    try:
        user_id = int(get_jwt_identity())
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Update last session logout time
        cursor.execute(
            """UPDATE user_sessions 
               SET logout_time = CURRENT_TIMESTAMP 
               WHERE user_id = %s AND logout_time IS NULL 
               ORDER BY login_time DESC LIMIT 1""",
            (user_id,)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token and return user info"""
    try:
        user_id = int(get_jwt_identity())
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500