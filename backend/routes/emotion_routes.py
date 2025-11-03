from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import cv2
import numpy as np
from tensorflow import keras
import base64
import os
from datetime import datetime
from backend.config.database import get_db_connection

bp = Blueprint('emotion', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'models', 'emotion_detection_model_final.keras')


model = None

# Emotion labels (adjust based on your model)
EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise', ]

def load_model():
    """Load the emotion detection model"""
    global model
    try:
        print("Loading model from:", MODEL_PATH)
        if os.path.exists(MODEL_PATH):
            model = keras.models.load_model(MODEL_PATH)
            print("Emotion detection model loaded successfully!")
        else:
            print(f"Model not found at {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")

# Load model on startup
load_model()

def preprocess_image(image):
    """Preprocess image for emotion detection"""
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Resize to model input size (typically 48x48 for emotion detection)
    resized = cv2.resize(gray, (48, 48))
    
    # Normalize
    normalized = resized / 255.0
    
    # Reshape for model input
    reshaped = normalized.reshape(1, 48, 48, 1)
    
    return reshaped

def detect_emotion_from_image(image):
    """Detect emotion from image"""
    if model is None:
        raise Exception("Model not loaded")
    
    # Detect face using OpenCV
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        return None, None, "No face detected"
    
    # Get the first face
    x, y, w, h = faces[0]
    face_img = image[y:y+h, x:x+w]
    
    # Preprocess and predict
    preprocessed = preprocess_image(face_img)
    predictions = model.predict(preprocessed, verbose=0)
    
    # Get emotion and confidence
    emotion_idx = np.argmax(predictions[0])
    confidence = float(predictions[0][emotion_idx])
    emotion = EMOTION_LABELS[emotion_idx]
    
    return emotion, confidence, None

@bp.route('/detect-image', methods=['POST'])
@jwt_required()
def detect_from_image():
    """Detect emotion from uploaded image"""
    try:
        user_id = int(get_jwt_identity())
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Read image
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400
        
        # Detect emotion
        emotion, confidence, error = detect_emotion_from_image(image)
        
        if error:
            return jsonify({'error': error}), 400
        
        # Save to database
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute(
            """INSERT INTO emotion_history (user_id, emotion, confidence, detection_type) 
               VALUES (%s, %s, %s, 'image')""",
            (user_id, emotion, confidence)
        )
        connection.commit()
        history_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Emotion detected successfully',
            'emotion': emotion,
            'confidence': confidence,
            'history_id': history_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/detect-webcam', methods=['POST'])
@jwt_required()
def detect_from_webcam():
    """Detect emotion from webcam capture (base64 image)"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Detect emotion
        emotion, confidence, error = detect_emotion_from_image(image)
        
        if error:
            return jsonify({'error': error}), 400
        
        # Save to database
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute(
            """INSERT INTO emotion_history (user_id, emotion, confidence, detection_type) 
               VALUES (%s, %s, %s, 'webcam')""",
            (user_id, emotion, confidence)
        )
        connection.commit()
        history_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Emotion detected successfully',
            'emotion': emotion,
            'confidence': confidence,
            'history_id': history_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_emotion_history():
    """Get user's emotion detection history"""
    try:
        user_id = int(get_jwt_identity())
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get total count
        cursor.execute(
            "SELECT COUNT(*) as total FROM emotion_history WHERE user_id = %s",
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        # Get history
        cursor.execute(
            """SELECT id, emotion, confidence, detection_type, created_at 
               FROM emotion_history 
               WHERE user_id = %s 
               ORDER BY created_at DESC 
               LIMIT %s OFFSET %s""",
            (user_id, limit, offset)
        )
        history = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Format dates
        for item in history:
            item['created_at'] = item['created_at'].isoformat() if item['created_at'] else None
        
        return jsonify({
            'history': history,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_emotion_stats():
    """Get user's emotion statistics"""
    try:
        user_id = int(get_jwt_identity())
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get emotion distribution
        cursor.execute(
            """SELECT emotion, COUNT(*) as count 
               FROM emotion_history 
               WHERE user_id = %s 
               GROUP BY emotion 
               ORDER BY count DESC""",
            (user_id,)
        )
        distribution = cursor.fetchall()
        
        # Get total detections
        cursor.execute(
            "SELECT COUNT(*) as total FROM emotion_history WHERE user_id = %s",
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'total_detections': total,
            'emotion_distribution': distribution
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500