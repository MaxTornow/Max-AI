import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCopy, FiExternalLink, FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUserRewrites, deleteRewrite, RewriteRow } from '../../services/rewrites/rewriteService';

/**
 * All Rewrites component
 * @returns {JSX.Element} All Rewrites page
 */
const AllRewrites: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rewrites, setRewrites] = useState<RewriteRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRewrite, setExpandedRewrite] = useState<string | null>(null);
  const [deletingRewrite, setDeletingRewrite] = useState<string | null>(null);
  const [rewriteToDelete, setRewriteToDelete] = useState<RewriteRow | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchRewrites = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await getUserRewrites(user.id);
        
        if (error) {
          setError(error);
        } else if (data) {
          setRewrites(data);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching rewrites');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRewrites();
  }, [user]);
  
  const toggleExpand = (id: string) => {
    if (expandedRewrite === id) {
      setExpandedRewrite(null);
    } else {
      setExpandedRewrite(id);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Text copied to clipboard', 'success');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy text', 'error');
      });
  };
  
  const handleDeleteClick = (rewrite: RewriteRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setRewriteToDelete(rewrite);
    setShowDeleteModal(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!rewriteToDelete) return;
    
    setDeletingRewrite(rewriteToDelete.id);
    
    try {
      const { success, error } = await deleteRewrite(rewriteToDelete.id);
      
      if (success) {
        // Remove the rewrite from the state
        setRewrites(prev => prev.filter(rewrite => rewrite.id !== rewriteToDelete.id));
        showToast('Rewrite deleted successfully', 'success');
      } else {
        showToast(error || 'Failed to delete rewrite', 'error');
      }
    } catch (err: any) {
      console.error('Error deleting rewrite:', err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setDeletingRewrite(null);
      setShowDeleteModal(false);
      setRewriteToDelete(null);
    }
  };
  
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRewriteToDelete(null);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">All Rewrites</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        View and manage all your generated content rewrites.
      </p>
      
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Loading rewrites...</span>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      ) : rewrites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            You don't have any saved rewrites yet. Create a rewrite in the VERA section to get started.
          </p>
          <div className="text-center">
            <Link 
              to="/vera/create"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Create New Rewrite
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rewrites.map((rewrite) => (
            <div key={rewrite.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => toggleExpand(rewrite.id)}
              >
                <div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{rewrite.platform.charAt(0).toUpperCase() + rewrite.platform.slice(1)} Rewrite</span>
                    <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
                      {rewrite.variations.length} {rewrite.variations.length === 1 ? 'variation' : 'variations'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Created: {formatDate(rewrite.created_at)}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center">
                    <a 
                      href={rewrite.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2"
                      title="View original video"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiExternalLink size={18} />
                    </a>
                    <button
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 mr-2"
                      title="Delete rewrite"
                      onClick={(e) => handleDeleteClick(rewrite, e)}
                      disabled={deletingRewrite === rewrite.id}
                    >
                      {deletingRewrite === rewrite.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600 dark:border-red-400"></div>
                      ) : (
                        <FiTrash2 size={18} />
                      )}
                    </button>
                    {expandedRewrite === rewrite.id ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
              </div>
              
              {expandedRewrite === rewrite.id && (
                <div className="p-4 border-t dark:border-gray-700">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style Parameters</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm">
                      <p className="mb-1"><span className="font-medium">Niche:</span> {rewrite.parameters.niche}</p>
                      <p className="mb-1"><span className="font-medium">Target Audience:</span> {rewrite.parameters.target_audience}</p>
                      <p className="mb-1"><span className="font-medium">Communication Style:</span> {rewrite.parameters.communication_style}</p>
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variations</h3>
                  <div className="space-y-3">
                    {rewrite.variations.map((variation) => (
                      <div key={variation.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(variation.created_at)}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(variation.content);
                            }}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            <FiCopy size={16} />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                            {variation.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && rewriteToDelete && (
        <ConfirmationModal
          title="Delete Rewrite"
          message={`Are you sure you want to delete this ${rewriteToDelete.platform} rewrite?`}
          details="This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={deletingRewrite === rewriteToDelete.id}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          type="danger"
        />
      )}
    </div>
  );
};

export default AllRewrites;