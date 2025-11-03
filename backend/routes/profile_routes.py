from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from backend.config.database import get_db_connection

bp = Blueprint('profile', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    try:
        user_id = int(get_jwt_identity())
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get user info
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Get statistics
        cursor.execute(
            "SELECT COUNT(*) as total FROM emotion_history WHERE user_id = %s",
            (user_id,)
        )
        emotion_count = cursor.fetchone()['total']
        
        cursor.execute(
            "SELECT COUNT(*) as total FROM music_recommendations WHERE user_id = %s",
            (user_id,)
        )
        music_count = cursor.fetchone()['total']
        
        # Get most detected emotion
        cursor.execute(
            """SELECT emotion, COUNT(*) as count 
               FROM emotion_history 
               WHERE user_id = %s 
               GROUP BY emotion 
               ORDER BY count DESC 
               LIMIT 1""",
            (user_id,)
        )
        most_emotion = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            },
            'statistics': {
                'total_emotions_detected': emotion_count,
                'total_music_recommendations': music_count,
                'most_detected_emotion': most_emotion['emotion'] if most_emotion else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/update', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        if 'name' in data:
            update_fields.append("name = %s")
            update_values.append(data['name'].strip())
        
        if not update_fields:
            cursor.close()
            connection.close()
            return jsonify({'error': 'No valid fields to update'}), 400
        
        update_values.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(update_values))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or not all(k in data for k in ['current_password', 'new_password']):
            return jsonify({'error': 'Current and new password required'}), 400
        
        current_password = data['current_password']
        new_password = data['new_password']
        
        # Validate new password
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify current password
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password'], current_password):
            cursor.close()
            connection.close()
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Update password
        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
        cursor.execute(
            "UPDATE users SET password = %s WHERE id = %s",
            (hashed_password, user_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/activity', methods=['GET'])
@jwt_required()
def get_activity():
    """Get user activity (combined emotion and music history)"""
    try:
        user_id = int(get_jwt_identity())
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        offset = (page - 1) * limit
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get combined activity
        cursor.execute(
            """SELECT 
                   eh.id,
                   eh.emotion,
                   eh.confidence,
                   eh.detection_type,
                   eh.created_at,
                   COUNT(mr.id) as recommendations_count
               FROM emotion_history eh
               LEFT JOIN music_recommendations mr ON eh.id = mr.emotion_history_id
               WHERE eh.user_id = %s
               GROUP BY eh.id
               ORDER BY eh.created_at DESC
               LIMIT %s OFFSET %s""",
            (user_id, limit, offset)
        )
        activity = cursor.fetchall()
        
        # Get total count
        cursor.execute(
            "SELECT COUNT(*) as total FROM emotion_history WHERE user_id = %s",
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        cursor.close()
        connection.close()
        
        # Format dates
        for item in activity:
            item['created_at'] = item['created_at'].isoformat() if item['created_at'] else None
        
        return jsonify({
            'activity': activity,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """Get user login sessions"""
    try:
        user_id = int(get_jwt_identity())
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """SELECT id, login_time, logout_time, ip_address, user_agent 
               FROM user_sessions 
               WHERE user_id = %s 
               ORDER BY login_time DESC 
               LIMIT 10""",
            (user_id,)
        )
        sessions = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Format dates
        for session in sessions:
            session['login_time'] = session['login_time'].isoformat() if session['login_time'] else None
            session['logout_time'] = session['logout_time'].isoformat() if session['logout_time'] else None
        
        return jsonify({'sessions': sessions}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/delete', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete user account"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'password' not in data:
            return jsonify({'error': 'Password required for account deletion'}), 400
        
        password = data['password']
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify password
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password'], password):
            cursor.close()
            connection.close()
            return jsonify({'error': 'Incorrect password'}), 401
        
        # Delete user (cascades to related tables)
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500