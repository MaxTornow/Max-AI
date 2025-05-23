import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useStyles } from '../../context/StylesContext';
import { StylesList, StyleForm, DeleteConfirmation } from '../../components/styles';
import Toast, { ToastType } from '../../components/ui/Toast';
import type { Style } from '../../services/styles';

/**
 * My Styles component for managing user's writing styles
 * @returns {JSX.Element} My Styles page
 */
const MyStyles: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { styles, isLoading, fetchStyles, addStyle, updateStyle, removeStyle } = useStyles();
  const userId = user?.id || '';
  const isAuthenticated = !!userId;
  
  // For compatibility with existing code
  const refreshStyles = fetchStyles;
  const setSelectedStyle = (style: Style | null) => {
    // This function is used for selecting a style for AI agents
    // We'll implement it if needed in the future
    console.log('Style selected:', style);
  };

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [styleToDelete, setStyleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({ 
    show: false, 
    message: '', 
    type: 'info' 
  });

  // Handle creating a new style
  const handleCreateStyle = async (styleData: any) => {
    console.log('handleCreateStyle called with userId:', userId);
    if (!userId) {
      console.error('Cannot create style: No user ID available');
      setToast({
        show: true,
        message: 'Cannot create style: You must be logged in',
        type: 'error'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('Creating style with data:', styleData);
      // Use the addStyle function from context
      const createdStyle = await addStyle(styleData);
      console.log('Style created successfully:', createdStyle);
      
      setIsFormOpen(false);
      setEditingStyle(null);
      
      // Show success toast
      setToast({
        show: true,
        message: 'Style created successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error creating style:', error);
      
      // Show error toast
      setToast({
        show: true,
        message: `Failed to create style: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating an existing style
  const handleUpdateStyle = async (styleData: any) => {
    if (!editingStyle) return;
    
    setIsSubmitting(true);
    try {
      // Use the updateStyle function from context
      await updateStyle(editingStyle.id, styleData);
      setIsFormOpen(false);
      setEditingStyle(null);
      
      // Show success toast
      setToast({
        show: true,
        message: 'Style updated successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating style:', error);
      
      // Show error toast
      setToast({
        show: true,
        message: `Failed to update style: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle style submission (create or update)
  const handleSubmitStyle = async (styleData: any) => {
    console.log('handleSubmitStyle called with data:', styleData);
    if (editingStyle) {
      console.log('Updating existing style');
      await handleUpdateStyle(styleData);
    } else {
      console.log('Creating new style');
      await handleCreateStyle(styleData);
    }
  };

  // Open form for editing
  const handleEditStyle = (style: Style) => {
    setEditingStyle(style);
    setIsFormOpen(true);
  };

  // Open delete confirmation
  const handleDeleteClick = (styleId: string) => {
    const style = styles.find((s: Style) => s.id === styleId);
    if (style) {
      setStyleToDelete({ id: style.id, name: style.name });
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm style deletion
  const handleConfirmDelete = async () => {
    if (!styleToDelete) return;
    
    setIsDeleting(true);
    try {
      // Use the removeStyle function from context
      await removeStyle(styleToDelete.id);
      
      // Close modal
      setIsDeleteModalOpen(false);
      setStyleToDelete(null);
      
      // Show success toast
      setToast({
        show: true,
        message: `Style "${styleToDelete.name}" deleted successfully!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting style:', error);
      
      // Show error toast
      setToast({
        show: true,
        message: `Failed to delete style: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle style selection (for use in AI agents)
  const handleSelectStyle = (style: Style) => {
    setSelectedStyle(style);
    // Copy to clipboard as a visual confirmation
    navigator.clipboard.writeText(style.content);
    
    // Show info toast
    setToast({
      show: true,
      message: `Style "${style.name}" selected and copied to clipboard`,
      type: 'info'
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Styles</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your personal writing styles for AI-generated content.
          </p>
        </div>
        
        {isAuthenticated ? (
          <button
            onClick={() => {
              setSelectedStyle(null);
              setIsFormOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <FiPlus className="mr-2" />
            New Style
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/login'}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Login to Create Styles
          </button>
        )}
      </div>

      {/* Authentication Check */}
      {!isAuthenticated && !authLoading && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You need to be logged in to create and manage styles. 
                <a href="/login" className="font-medium underline text-yellow-700 hover:text-yellow-600">Log in</a> or 
                <a href="/signup" className="font-medium underline text-yellow-700 hover:text-yellow-600">sign up</a> to continue.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Styles List */}
      {!isFormOpen && (
        <StylesList
          styles={styles}
          isLoading={isLoading}
          onCreateNew={() => {
            if (isAuthenticated) {
              setSelectedStyle(null);
              setIsFormOpen(true);
            } else {
              // Redirect to login if not authenticated
              window.location.href = '/login';
            }
          }}
          onEdit={handleEditStyle}
          onDelete={handleDeleteClick}
          onSelect={handleSelectStyle}
        />
      )}

      {/* Style Form */}
      {isFormOpen && (
        <StyleForm
          initialStyle={editingStyle || undefined}
          onSubmit={handleSubmitStyle}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingStyle(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && styleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <DeleteConfirmation
              styleName={styleToDelete.name}
              isDeleting={isDeleting}
              onConfirm={handleConfirmDelete}
              onCancel={() => {
                setIsDeleteModalOpen(false);
                setStyleToDelete(null);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};

export default MyStyles;