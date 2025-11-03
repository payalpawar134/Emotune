// ==================== src/components/Layout/Navbar.jsx ====================
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, User, LogOut, Music, Home } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-cyan-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 shadow-lg sticky top-0 z-50 transition-all duration-300 border-b border-cyan-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-600 dark:to-blue-700 p-2.5 rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
              EmoTune
            </span>
          </Link>

          {/* Navigation Links and Controls */}
          <div className="flex items-center space-x-3">
            {/* Home Button - Only show when logged in */}
            {user && (
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold transition-all duration-300 ${
                  isActive("/")
                    ? "bg-cyan-500 dark:bg-cyan-600 text-white shadow-md scale-105"
                    : "text-gray-700 dark:text-gray-300 hover:bg-cyan-100 dark:hover:bg-gray-800"
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Home</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-amber-100 dark:bg-gray-800 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {user && (
              <>
                {/* Profile Link */}
                <Link
                  to="/profile"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold transition-all duration-300 ${
                    isActive("/profile")
                      ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md scale-105"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">
                    {user.name}
                  </span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;