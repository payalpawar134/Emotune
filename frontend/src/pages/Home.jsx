/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  StopCircle,
  Loader,
  Music2,
  Sparkles,
  Image as ImageIcon,
  Video,
  AlertCircle,
} from "lucide-react";
import axios from "../utils/axios";
import { API_ENDPOINTS } from "../config/api";
import MusicPlayer from "../components/MusicPlayer";

const Home = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // 👈 Added preview state

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const emotionResultRef = useRef(null);
  const musicSectionRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setError("");
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  const scrollToElement = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const captureAndDetect = async () => {
    if (!videoRef.current) return;
    setDetecting(true);
    setError("");
    setDetectionSuccess(false);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(
        async (blob) => {
          try {
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });

            const response = await axios.post(API_ENDPOINTS.DETECT_WEBCAM, {
              image: base64,
            });
            setEmotion(response.data.emotion);
            setConfidence(response.data.confidence);
            setDetectionSuccess(true);
            setTimeout(() => scrollToElement(emotionResultRef), 300);
            await fetchMusicRecommendations(
              response.data.emotion,
              response.data.history_id
            );
          } catch (err) {
            setError(err.response?.data?.error || "Failed to detect emotion");
          } finally {
            setDetecting(false);
          }
        },
        "image/jpeg"
      );
    } catch (err) {
      setError("Failed to capture image");
      setDetecting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 👇 Added for preview (doesn't affect upload)
    setPreviewImage(URL.createObjectURL(file));

    setDetecting(true);
    setError("");
    setDetectionSuccess(false);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await axios.post(API_ENDPOINTS.DETECT_IMAGE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEmotion(response.data.emotion);
      setConfidence(response.data.confidence);
      setDetectionSuccess(true);
      setTimeout(() => scrollToElement(emotionResultRef), 300);
      await fetchMusicRecommendations(
        response.data.emotion,
        response.data.history_id
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to detect emotion");
    } finally {
      setDetecting(false);
    }
  };

  const fetchMusicRecommendations = async (emotionValue, historyId) => {
    setLoading(true);
    try {
      const response = await axios.post(API_ENDPOINTS.RECOMMEND_MUSIC, {
        emotion: emotionValue,
        emotion_history_id: historyId,
        limit: 20,
      });
      setTracks(response.data.tracks);
      setTimeout(() => scrollToElement(musicSectionRef), 800);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to fetch music recommendations"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const emotionColors = {
    happy: "from-pink-50 to-pink-100 border-pink-200",
    sad: "from-blue-50 to-blue-100 border-blue-200",
    angry: "from-rose-50 to-rose-100 border-rose-200",
    fear: "from-purple-50 to-purple-100 border-purple-200",
    surprise: "from-pink-100 to-white border-pink-200",
    disgust: "from-gray-50 to-gray-100 border-gray-200",
    neutral: "from-pink-50 to-white border-pink-100",
  };

  const emotionEmojis = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    fear: "😨",
    surprise: "😲",
    disgust: "🤢",
    neutral: "😐",
  };

  return (
    <div className="min-h-screen bg-pink-50 font-[Poppins] text-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-lg mb-6 border border-pink-100">
            <Sparkles className="w-8 h-8 text-pink-400" />
          </div>
          <h1 className="text-4xl font-semibold text-pink-600 mb-3">
            Discover Your{" "}
            <span className="text-gray-800">Emotional Soundtrack</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            AI-powered emotion detection with a soft and elegant look
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-white border border-pink-100 rounded-2xl p-5 flex items-center gap-3 shadow-md">
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-pink-500" />
            </div>
            <p className="text-gray-700">{error}</p>
          </div>
        )}

        {/* Detection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Camera Card */}
          <div className="bg-white rounded-3xl p-8 border border-pink-100 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                <Video className="w-6 h-6 text-pink-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700">
                Live Camera
              </h2>
            </div>

            <div className="bg-pink-50 rounded-2xl overflow-hidden mb-6 relative">
              <div style={{ paddingTop: "75%" }} className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-50">
                    <Camera className="w-16 h-16 text-pink-300 mb-3" />
                    <p className="text-pink-400 text-sm">Camera inactive</p>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute top-4 right-4 bg-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    Active
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl transition-all font-medium shadow"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={stopCamera}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-600 rounded-2xl font-medium shadow-sm"
                  >
                    <StopCircle className="w-4 h-4" /> Stop
                  </button>
                  <button
                    onClick={captureAndDetect}
                    disabled={detecting}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow"
                  >
                    {detecting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Detect
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-3xl p-8 border border-pink-100 shadow-md hover:shadow-lg transition-all duration-300 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-pink-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700">
                Upload Photo
              </h2>
            </div>

            <div
              className="border-2 border-dashed border-pink-200 rounded-2xl p-12 text-center hover:border-pink-300 transition-colors cursor-pointer bg-pink-50 hover:bg-white"
              onClick={() => document.getElementById("fileInput").click()}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-pink-300" />
              <p className="text-pink-600 mb-1 font-medium">
                Drop your image here
              </p>
              <p className="text-sm text-pink-400">or click to browse</p>

              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {detecting && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                  <Loader className="w-10 h-10 animate-spin text-pink-600" />
                </div>
              )}
            </div>

            {/* 👇 Preview Image Section */}
            {previewImage && (
              <div className="mt-6 bg-pink-50 rounded-2xl p-4 border border-pink-100 flex flex-col items-center">
                <p className="text-pink-500 text-sm mb-2 font-medium">
                  Image Preview
                </p>
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full max-w-xs rounded-2xl object-cover shadow-md"
                />
              </div>
            )}

            {/* Emotion Result */}
            {emotion && (
              <div
                ref={emotionResultRef}
                className={`mt-6 bg-gradient-to-r ${
                  emotionColors[emotion] || "from-pink-50 to-white"
                } rounded-2xl p-6 border`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">
                      {emotionEmojis[emotion] || "😊"}
                    </span>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Detected</p>
                      <p className="text-2xl font-semibold capitalize text-pink-700">
                        {emotion}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Confidence</p>
                    <p className="text-2xl font-bold text-pink-700">
                      {(confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-sm mb-6 border border-pink-100">
              <Loader className="w-8 h-8 animate-spin text-pink-600" />
            </div>
            <p className="text-xl text-pink-700 font-light">
              Curating your perfect playlist...
            </p>
            <p className="mt-2 text-pink-400">Based on your {emotion} mood</p>
          </div>
        )}

        {/* Music Section */}
        {tracks.length > 0 && !loading && (
          <div
            ref={musicSectionRef}
            className="bg-white rounded-3xl p-8 border border-pink-100 shadow-md"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                  <Music2 className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-700">
                    Your Playlist
                  </h2>
                  <p className="text-pink-400 text-sm">
                    Matched to your {emotion} emotion
                  </p>
                </div>
              </div>
              <span className="px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">
                {tracks.length} songs
              </span>
            </div>
            <MusicPlayer tracks={tracks} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
