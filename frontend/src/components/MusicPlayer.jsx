/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ExternalLink,
  Volume2,
  VolumeX,
  Music,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MusicPlayer = ({ tracks }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSpotifyEmbed, setShowSpotifyEmbed] = useState(false);

  const audioRef = useRef(null);
  const spotifyIframeRef = useRef(null);
  const controlsRef = useRef(null);

  const currentTrack = tracks[currentTrackIndex];

  // Volume update
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Reset on track change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(false);

    // 🧩 Keep Spotify player visible if last track used Spotify embed
    if (!tracks[currentTrackIndex]?.preview_url) {
      setShowSpotifyEmbed(true);
    } else {
      setShowSpotifyEmbed(false);
    }

    controlsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentTrackIndex]);

  const togglePlayPause = () => {
    if (currentTrack?.preview_url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        audioRef.current.load(); // ✅ ensures buffer is reloaded correctly
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error("Playback failed:", err);
            setIsLoading(false);
          });
      }
    }
  };

  const playNext = () =>
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  const playPrevious = () =>
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);

  const handleTimeUpdate = () =>
    setCurrentTime(audioRef.current?.currentTime || 0);
  const handleLoadedMetadata = () =>
    setDuration(audioRef.current?.duration || 0);

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => setVolume(e.target.value / 100);
  const toggleMute = () => setVolume(volume === 0 ? 1 : 0);

  const formatTime = (t) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const formatDuration = (ms) => {
    if (!ms) return "0:00";
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${(total % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Track Info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrack.id || currentTrackIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center space-x-4">
            {currentTrack?.image_url ? (
              <div className="relative">
                <img
                  src={currentTrack.image_url}
                  alt={currentTrack.name}
                  className="w-20 h-20 rounded-lg object-cover shadow-md"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                <Music className="w-8 h-8 text-gray-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {currentTrack?.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 truncate">
                {currentTrack?.artist}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {currentTrack?.album}
              </p>
              {currentTrack?.duration_ms && (
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formatDuration(currentTrack.duration_ms)}
                </p>
              )}
            </div>

            {currentTrack?.spotify_url && (
              <a
                href={currentTrack.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Spotify</span>
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Audio or Spotify Embed */}
      {currentTrack?.preview_url ? (
        <audio
          ref={audioRef}
          src={currentTrack.preview_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={playNext}
          onCanPlay={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
        />
      ) : currentTrack?.spotify_embed_url ? (
        <>
          <button
            onClick={() => setShowSpotifyEmbed(!showSpotifyEmbed)}
            className="w-full mb-4 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <Music className="w-5 h-5" />
            <span>{showSpotifyEmbed ? "Hide" : "Show"} Spotify Player</span>
          </button>
          {showSpotifyEmbed && (
            <iframe
              ref={spotifyIframeRef}
              src={`${currentTrack.spotify_embed_url}?utm_source=generator`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg shadow-lg"
            ></iframe>
          )}
        </>
      ) : null}

      {/* Control Bar */}
      <div
        ref={controlsRef}
        className="flex flex-wrap items-center justify-center gap-4 bg-white/40 dark:bg-gray-800/40 rounded-xl p-4 shadow-md sticky bottom-4 backdrop-blur-md"
      >
        {/* Previous */}
        <button
          onClick={playPrevious}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          title="Previous"
        >
          <SkipBack className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlayPause}
          disabled={!currentTrack?.preview_url || isLoading}
          className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-transform transform hover:scale-110 disabled:opacity-50"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={playNext}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          title="Next"
        >
          <SkipForward className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>

        {/* Progress */}
        {currentTrack?.preview_url && (
          <div className="flex flex-col items-center w-full max-w-md">
            <input
              type="range"
              min="0"
              max="100"
              value={(currentTime / duration) * 100 || 0}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 w-full">
              <span>{formatTime(currentTime)}</span>
              <span>30s Preview</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Volume */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <VolumeX className="w-5 h-5 text-gray-800 dark:text-gray-300" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-800 dark:text-gray-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Track List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {tracks.map((track, i) => (
          <div
            key={track.id || i}
            onClick={() => setCurrentTrackIndex(i)}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
              i === currentTrackIndex
                ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {track.image_url ? (
              <img
                src={track.image_url}
                alt={track.name}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <Music className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {track.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {track.artist}
              </p>
              {track.duration_ms && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDuration(track.duration_ms)}
                </p>
              )}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                track.preview_url
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              }`}
            >
              {track.preview_url ? "Preview" : "Spotify"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer;