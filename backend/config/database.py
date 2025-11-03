import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'emotune')
}

# Connection pool
connection_pool = pooling.MySQLConnectionPool(
    pool_name="emotune_pool",
    pool_size=5,
    pool_reset_session=True,
    **DB_CONFIG
)

def get_db_connection():
    """Get a connection from the pool"""
    return connection_pool.get_connection()

def init_database():
    """Initialize database tables"""
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email)
            )
        """)
        
        # Emotion history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emotion_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                emotion VARCHAR(50) NOT NULL,
                confidence FLOAT,
                image_path VARCHAR(500),
                detection_type ENUM('image', 'webcam') DEFAULT 'webcam',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        """)
        
        # Music recommendations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS music_recommendations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                emotion_history_id INT,
                track_name VARCHAR(500) NOT NULL,
                artist_name VARCHAR(500),
                track_id VARCHAR(255),
                album_name VARCHAR(500),
                preview_url TEXT,
                spotify_url TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (emotion_history_id) REFERENCES emotion_history(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id)
            )
        """)
        
        # User sessions table (for tracking active sessions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                logout_time TIMESTAMP NULL,
                ip_address VARCHAR(50),
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id)
            )
        """)
        
        connection.commit()
        print("Database tables initialized successfully!")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

if __name__ == '__main__':
    init_database()