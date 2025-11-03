from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import base64
import os
from datetime import datetime, timedelta
from backend.config.database import get_db_connection

bp = Blueprint('music', __name__)

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

# Cache for Spotify access token
spotify_token_cache = {
    'token': None,
    'expires_at': None
}

def get_spotify_token():
    """Get Spotify access token"""
    global spotify_token_cache
    
    if spotify_token_cache['token'] and spotify_token_cache['expires_at']:
        if datetime.now() < spotify_token_cache['expires_at']:
            return spotify_token_cache['token']
    
    auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code != 200:
        raise Exception("Failed to get Spotify access token")
    
    token_data = response.json()
    spotify_token_cache['token'] = token_data['access_token']
    spotify_token_cache['expires_at'] = datetime.now() + timedelta(seconds=token_data['expires_in'] - 60)
    
    return spotify_token_cache['token']

def get_recommendations_by_genre(emotion, limit=20):
    """Get recommendations based on emotion-mapped genres - using VALID Spotify genres only"""
    token = get_spotify_token()
    
    # These are VERIFIED valid Spotify genre seeds
    valid_genres = {
        'happy': ['pop', 'dance', 'party'],
        'sad': ['acoustic', 'piano', 'sad'],
        'angry': ['rock', 'metal', 'punk'],
        'fear': ['ambient', 'chill', 'indie'],
        'surprise': ['electronic', 'edm', 'dance'],
        'disgust': ['grunge', 'alternative', 'rock'],
        'neutral': ['indie', 'alternative', 'pop']
    }
    
    seed_genres = valid_genres.get(emotion.lower(), ['pop', 'indie'])[:5]
    
    url = "https://api.spotify.com/v1/recommendations"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "seed_genres": ','.join(seed_genres),
        "limit": min(limit, 100),
        "market": "US"
    }
    
    # Add audio features based on emotion
    if emotion.lower() == 'happy':
        params.update({"target_valence": 0.8, "target_energy": 0.7})
    elif emotion.lower() == 'sad':
        params.update({"target_valence": 0.3, "target_energy": 0.4})
    elif emotion.lower() == 'angry':
        params.update({"target_energy": 0.9})
    elif emotion.lower() in ['fear', 'neutral']:
        params.update({"target_valence": 0.5, "target_energy": 0.5})
    elif emotion.lower() == 'surprise':
        params.update({"target_energy": 0.8})
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"Spotify recommendations failed with genres {seed_genres}: {e}")
        # Fallback to search if recommendations fail
        return search_spotify_tracks_fallback(token, emotion, limit)

def search_spotify_tracks_fallback(token, emotion, limit=20):
    """Fallback search when recommendations API fails"""
    search_queries = {
        'happy': 'happy upbeat positive',
        'sad': 'sad emotional melancholy',
        'angry': 'rock energetic intense',
        'fear': 'calm peaceful ambient',
        'surprise': 'electronic dance party',
        'disgust': 'alternative indie rock',
        'neutral': 'chill indie alternative'
    }
    
    query = search_queries.get(emotion.lower(), 'popular music')
    
    url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "type": "track",
        "limit": limit,
        "market": "US"
    }
    
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    
    search_data = response.json()
    return {
        "tracks": search_data.get("tracks", {}).get("items", [])
    }

@bp.route('/recommend', methods=['POST'])
@jwt_required()
def recommend_music():
    """Get music recommendations"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'emotion' not in data:
            return jsonify({'error': 'Emotion is required'}), 400
        
        emotion = data['emotion']
        emotion_history_id = data.get('emotion_history_id')
        limit = data.get('limit', 20)
        
        valid_emotions = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral']
        if emotion.lower() not in valid_emotions:
            return jsonify({'error': f'Invalid emotion'}), 400
        
        try:
            recommendations = get_recommendations_by_genre(emotion, limit)
            tracks = recommendations.get('tracks', [])
        except Exception as spotify_error:
            print(f"Spotify error: {spotify_error}")
            return jsonify({'error': 'Unable to fetch recommendations', 'details': str(spotify_error)}), 500
        
        if not tracks:
            return jsonify({'error': 'No recommendations found'}), 404
        
        formatted_tracks = []
        connection = get_db_connection()
        cursor = connection.cursor()
        
        for track in tracks:
            try:
                track_id = track.get('id', '')
                preview_url = track.get('preview_url')
                
                # Spotify embed URL
                spotify_embed_url = f"https://open.spotify.com/embed/track/{track_id}" if track_id else None
                
                track_data = {
                    'id': track_id,
                    'name': track.get('name', 'Unknown'),
                    'artist': ', '.join([artist.get('name', '') for artist in track.get('artists', [])]),
                    'album': track.get('album', {}).get('name', ''),
                    'preview_url': preview_url,
                    'spotify_url': track.get('external_urls', {}).get('spotify', ''),
                    'spotify_embed_url': spotify_embed_url,
                    'image_url': track.get('album', {}).get('images', [{}])[0].get('url') if track.get('album', {}).get('images') else None,
                    'duration_ms': track.get('duration_ms', 0),
                    'has_preview': preview_url is not None
                }
                
                formatted_tracks.append(track_data)
                
                cursor.execute(
                    """INSERT INTO music_recommendations 
                       (user_id, emotion_history_id, track_name, artist_name, track_id, 
                        album_name, preview_url, spotify_url, image_url) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (user_id, emotion_history_id, track_data['name'], track_data['artist'],
                     track_data['id'], track_data['album'], track_data['preview_url'],
                     track_data['spotify_url'], track_data['image_url'])
                )
            except Exception as track_error:
                print(f"Error processing track: {track_error}")
                continue
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Recommendations generated successfully',
            'emotion': emotion,
            'tracks': formatted_tracks,
            'count': len(formatted_tracks)
        }), 200
        
    except Exception as e:
        print(f"Error in recommend_music: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_music_history():
    """Get user's music recommendation history"""
    try:
        user_id = int(get_jwt_identity())
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT COUNT(*) as total FROM music_recommendations WHERE user_id = %s",
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        cursor.execute(
            """SELECT id, track_name, artist_name, album_name, preview_url, 
                      spotify_url, image_url, created_at 
               FROM music_recommendations 
               WHERE user_id = %s 
               ORDER BY created_at DESC 
               LIMIT %s OFFSET %s""",
            (user_id, limit, offset)
        )
        history = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
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

@bp.route('/genres', methods=['GET'])
def get_available_genres():
    """Get available Spotify genres"""
    try:
        token = get_spotify_token()
        
        url = "https://api.spotify.com/v1/recommendations/available-genre-seeds"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            raise Exception("Failed to get genres")
        
        return jsonify(response.json()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500