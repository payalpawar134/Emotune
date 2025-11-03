# infer_webcam.py
import cv2, numpy as np, tensorflow as tf, time, os # pyright: ignore[reportMissingImports]
from tensorflow.keras.models import load_model # type: ignore

# model = load_model("ml/models/facial_emotion_model.keras")

# model = load_model("ml/models/emotion_recognition_model.keras")

#happy 81 wala 
model = load_model("ml/models/emotion_detection_model_final.keras")
# model = load_model("ml/models/emotion_recognition_model_new.keras")
# model = load_model("ml/models/new_emotion_trained_model.keras")

# model = tf.keras.models.load_model(os.path.join("ml","models","emotune_savedmodel"))
CLASS_NAMES = ['angry','disgust','fear','happy','sad','surprise','neutral']
IMG_SIZE = (48,48)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret: break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    for (x,y,w,h) in faces:
        face = gray[y:y+h, x:x+w]
        face = cv2.resize(face, IMG_SIZE)
        face = face.astype('float32')/255.0
        face = np.expand_dims(face, axis=(0,-1))   # shape (1,48,48,1)
        preds = model.predict(face)
        label = CLASS_NAMES[np.argmax(preds)]
        prob = np.max(preds)
        cv2.rectangle(frame, (x,y),(x+w,y+h),(255,0,0),2)
        cv2.putText(frame, f"{label} {prob:.2f}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

    cv2.imshow("EmoTune - Press q to quit", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()