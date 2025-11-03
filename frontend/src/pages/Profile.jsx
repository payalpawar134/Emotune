import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../utils/axios";
import { API_ENDPOINTS } from "../config/api";
import {
  User,
  Mail,
  Calendar,
  Music,
  Heart,
  TrendingUp,
  Lock,
  Loader,
  Save,
  Edit3,
  Shield,
} from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PROFILE);
      setProfile(response.data.user);
      setStats(response.data.statistics);
      setName(response.data.user.name);
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      await axios.put(API_ENDPOINTS.UPDATE_PROFILE, { name });
      setSuccess("Profile updated successfully");
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(API_ENDPOINTS.CHANGE_PASSWORD, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess("Password changed successfully");
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
        <div className="text-center">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
            <Loader className="w-6 h-6 text-pink-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-700 font-semibold text-lg">
            Loading Profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 text-gray-800 font-[Outfit]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            My Profile
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your personal info and security preferences
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-pink-400 to-gray-300 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-pink-100 border-l-4 border-pink-400 text-pink-700 p-4 rounded-xl shadow-sm">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border-l-4 border-green-400 text-green-700 p-4 rounded-xl shadow-sm">
            <p className="font-semibold">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-md p-8 border border-pink-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-200 to-pink-100 flex items-center justify-center shadow-md">
                  <User className="w-14 h-14 text-gray-700" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-2xl font-bold px-4 py-2 border-2 border-pink-300 rounded-xl bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300 w-full sm:w-auto"
                  />
                ) : (
                  <h2 className="text-3xl font-bold text-gray-900">
                    {profile?.name}
                  </h2>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-gray-600">
                  <Mail className="w-4 h-4 text-pink-400" />
                  <span>{profile?.email}</span>
                </div>

                {isEditing ? (
                  <div className="flex gap-3 mt-4 justify-center sm:justify-start">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={updating}
                      className="px-5 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50"
                    >
                      <Save className="inline w-4 h-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setName(profile?.name);
                      }}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-5 px-5 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
                  >
                    <Edit3 className="inline w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Member info */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex items-center p-5 bg-pink-50 border border-pink-100 rounded-xl">
                <Calendar className="w-7 h-7 text-pink-400 mr-4" />
                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    Member Since
                  </p>
                  <p className="font-bold text-gray-800">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <Shield className="w-7 h-7 text-gray-500 mr-4" />
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Status</p>
                  <p className="font-bold text-gray-800">VERIFIED</p>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="mt-10">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-pink-400" />
                  Security
                </h3>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition"
                >
                  {showPasswordChange ? "Close" : "Change Password"}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full py-3 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Statistics</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-gray-300 mx-auto rounded-full"></div>
            </div>

            <div className="bg-gradient-to-br from-pink-100 to-white border border-pink-200 p-6 rounded-2xl text-center shadow-sm">
              <Heart className="w-9 h-9 text-pink-400 mx-auto mb-2" />
              <p className="text-xs font-semibold uppercase text-gray-500">
                Emotions Detected
              </p>
              <p className="text-3xl font-extrabold text-gray-900">
                {stats?.total_emotions_detected || 0}
              </p>
            </div>

            <div className="bg-gradient-to-br from-white to-pink-50 border border-pink-200 p-6 rounded-2xl text-center shadow-sm">
              <Music className="w-9 h-9 text-pink-400 mx-auto mb-2" />
              <p className="text-xs font-semibold uppercase text-gray-500">
                Songs Recommended
              </p>
              <p className="text-3xl font-extrabold text-gray-900">
                {stats?.total_music_recommendations || 0}
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 p-6 rounded-2xl text-center shadow-sm">
              <TrendingUp className="w-9 h-9 text-pink-400 mx-auto mb-2" />
              <p className="text-xs font-semibold uppercase text-gray-500">
                Top Emotion
              </p>
              <p className="text-xl font-bold text-gray-800 capitalize">
                {stats?.most_detected_emotion || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
