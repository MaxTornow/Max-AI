import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { FiMessageSquare, FiCopy, FiList, FiAward, FiCheckCircle } from 'react-icons/fi';

/**
 * Dashboard page component
 * @returns {JSX.Element} Dashboard page
 */
const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Feature cards for the dashboard
  const features = [
    {
      title: 'AI Max Chat',
      description: 'Max Tornow VGA Course Coach - Get personalized guidance on viral content creation',
      icon: <FiAward size={24} className="text-orange-600 dark:text-orange-400" />,
      path: '/aimax',
      color: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: 'AVA Chat',
      description: 'Advanced Viral Automator - Conversational AI for content ideation and script generation',
      icon: <FiMessageSquare size={24} className="text-primary-600 dark:text-primary-400" />,
      path: '/ava',
      color: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'LARA Chat',
      description: 'LinkedIn Automated Rewriting Assistant - Rewrites LinkedIn posts in your personal tone & style',
      icon: <FiMessageSquare size={24} className="text-indigo-600 dark:text-indigo-400" />,
      path: '/lara',
      color: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      title: 'LACY Chat',
      description: 'LinkedIn Automated Content for You - Creates LinkedIn posts tailored for coaching businesses',
      icon: <FiMessageSquare size={24} className="text-purple-600 dark:text-purple-400" />,
      path: '/lacy',
      color: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'FRANCK Chat',
      description: 'Facebook Relevant Automated Niche Content Kreator - Creates Facebook posts for coaching businesses',
      icon: <FiMessageSquare size={24} className="text-green-600 dark:text-green-400" />,
      path: '/franck',
      color: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'FARIS Chat',
      description: 'Facebook Automated Rewriting Intelligent Scholar - Rewrites Facebook posts into your personalized tone',
      icon: <FiMessageSquare size={24} className="text-teal-600 dark:text-teal-400" />,
      path: '/faris',
      color: 'bg-teal-50 dark:bg-teal-900/20',
    },
    {
      title: 'SAGE',
      description: 'Script Analysis & Grading Engine - Analyze and improve your video scripts for maximum virality',
      icon: <FiCheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />,
      path: '/sage',
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Create Rewrite (VERA)',
      description: 'Viral Enhanced Rewrite Automator - Analyze viral videos and create customized script variants',
      icon: <FiCopy size={24} className="text-amber-600 dark:text-amber-400" />,
      path: '/create-rewrite',
      color: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'My Styles',
      description: 'Manage your personal writing styles for AI-generated content',
      icon: <FiList size={24} className="text-rose-600 dark:text-rose-400" />,
      path: '/my-styles',
      color: 'bg-rose-50 dark:bg-rose-900/20',
    },
    {
      title: 'All Rewrites',
      description: 'View and manage all your generated content rewrites',
      icon: <FiList size={24} className="text-cyan-600 dark:text-cyan-400" />,
      path: '/all-rewrites',
      color: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {user?.user_metadata?.full_name || 'User'}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Get started with MAXAI's AI-powered content creation tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Link
            key={index}
            to={feature.path}
            className={`${feature.color} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex flex-col h-full">
              <div className="mb-4">{feature.icon}</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow">
                {feature.description}
              </p>
              <div className="mt-4">
                <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                  Get started →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No recent activity to display.</p>
          <p className="mt-2">Start using MAXAI's tools to see your activity here!</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;