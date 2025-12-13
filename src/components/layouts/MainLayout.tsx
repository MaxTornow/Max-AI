import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoImage from '../../assets/Smartphone Freedom Lifestyle Logo 1.png';
import {
  FiHome,
  FiMessageSquare,
  FiCopy,
  FiList,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiMoon,
  FiSun,
  FiUser,
  FiFilm
} from 'react-icons/fi';

/**
 * Main layout component with sidebar navigation
 * @returns {JSX.Element} MainLayout component
 */
const MainLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when clicking a link on mobile
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Navigation items
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FiHome size={20} /> },
    { path: '/ava', label: 'AVA (Advanced Viral Automator)', icon: <FiMessageSquare size={20} /> },
    { path: '/aimax', label: 'AI MAX (VGA Course Coach)', icon: <FiMessageSquare size={20} /> },
    { path: '/create-rewrite', label: 'VERA (Viral Enhanced Rewrite Automator)', icon: <FiCopy size={20} /> },
    { path: '/lara', label: 'LARA (LinkedIn Automated Rewriting Assistant)', icon: <FiMessageSquare size={20} /> },
    { path: '/lacy', label: 'LACY (LinkedIn Automated Content for You)', icon: <FiMessageSquare size={20} /> },
    { path: '/franck', label: 'FRANCK (Facebook Relevant Automated Niche Content Kreator)', icon: <FiMessageSquare size={20} /> },
    { path: '/faris', label: 'FARIS (Facebook Automated Rewriting Intelligent Scholar)', icon: <FiMessageSquare size={20} /> },
    { path: '/sage', label: 'SAGE (Script Analysis & Grading Engine)', icon: <FiMessageSquare size={20} /> },
    { path: '/vince', label: 'VINCE (Vertical INstant Content Editor)', icon: <FiFilm size={20} /> },
    { path: '/tyler', label: 'TYLER (Text Overlay for Your Videos)', icon: <FiFilm size={20} /> },
    { path: '/my-styles', label: 'My Styles', icon: <FiList size={20} /> },
    { path: '/all-rewrites', label: 'All Rewrites', icon: <FiList size={20} /> },
    { path: '/settings', label: 'Settings', icon: <FiSettings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <Link to="/" className="flex items-center justify-center w-full" onClick={closeSidebarOnMobile}>
              <img src={logoImage} alt="Smartphone Freedom Lifestyle" className="h-16 mx-auto" />
            </Link>
            <button 
              className="p-1 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={toggleSidebar}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/30'
                    }`}
                    onClick={closeSidebarOnMobile}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                {user?.user_metadata?.full_name ? (
                  <span className="text-primary-700 dark:text-primary-300 font-medium">
                    {user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                ) : (
                  <FiUser className="text-primary-700 dark:text-primary-300" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <button
                  onClick={async () => {
                    try {
                      setIsSigningOut(true);
                      await signOut();
                      // Redirect to login page after successful sign-out
                      navigate('/login');
                    } catch (error) {
                      console.error('Error signing out:', error);
                    } finally {
                      setIsSigningOut(false);
                    }
                  }}
                  disabled={isSigningOut}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <FiLogOut size={12} className="mr-1" />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-full px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {theme === 'dark' ? (
                <>
                  <FiSun size={16} className="mr-2" />
                  Switch to Light Mode
                </>
              ) : (
                <>
                  <FiMoon size={16} className="mr-2" />
                  Switch to Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="p-1 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={toggleSidebar}
            >
              <FiMenu size={24} />
            </button>
            <div className="md:hidden flex justify-center">
              <img src={logoImage} alt="Smartphone Freedom Lifestyle" className="h-12" />
            </div>
            <div className="flex items-center">
              {/* Additional header elements can go here */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;