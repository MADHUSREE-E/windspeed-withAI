import React, { useState, useEffect } from 'react';
import Switch from 'react-switch';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wind, User, LogOut, Shield, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('windcast_darkmode') === 'true';
  });
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('windcast_darkmode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  return (
    <nav className="bg-white/80 dark:bg-gray-900 dark:text-white backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Wind className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">WindCast Pro</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Dark Mode</span>
              <Switch
                checked={darkMode}
                onChange={setDarkMode}
                onColor="#2563eb"
                offColor="#d1d5db"
                uncheckedIcon={false}
                checkedIcon={false}
                aria-label="Toggle dark mode"
              />
            </div>
            <Link
              to="/about"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/about' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              About
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/prediction"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/prediction' ? 'bg-blue-700 dark:bg-blue-900 text-white dark:text-blue-200 font-bold border border-blue-300 shadow-sm' : 'bg-blue-600 dark:bg-blue-800 text-white dark:text-blue-200 hover:bg-blue-700 dark:hover:bg-blue-900'}`}
                >
                  Prediction
                </Link>
                <Link
                  to="/monitor"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/monitor' ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-600 shadow-sm' : 'text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-400'}`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Monitor</span>
                </Link>
                <NotificationBell />
                
                {user?.isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/admin' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold border border-purple-600 shadow-sm' : 'text-purple-600 dark:text-purple-200 hover:text-purple-700 dark:hover:text-purple-400'}`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
                
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                  <span className="text-gray-700 dark:text-gray-200 text-sm">{user?.name}</span>
                  <Link
                    to="/profile"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-600 shadow-sm' : 'text-blue-600 dark:text-blue-200 hover:text-blue-700 dark:hover:text-blue-400'}`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/login' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400'}`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/register' ? 'bg-blue-700 dark:bg-blue-900 text-white dark:text-blue-200 font-bold border border-blue-300 shadow-sm' : 'bg-blue-600 dark:bg-blue-800 text-white dark:text-blue-200 hover:bg-blue-700 dark:hover:bg-blue-900'}`}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;