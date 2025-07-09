import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { deleteUser, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase/config';

const ProfileSettings = ({ user, userProfile, onBack, onProfileUpdated, onAccountDeleted }) => {
  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Account deletion states
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Validation states
  const [touched, setTouched] = useState({
    displayName: false,
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setIsPublic(userProfile.isPublic || false);
    }
  }, [userProfile]);

  // Validation functions
  const validateDisplayName = (name) => {
    if (!name.trim()) {
      return 'Display name is required';
    } else if (name.trim().length < 2) {
      return 'Display name must be at least 2 characters';
    } else if (name.trim().length > 50) {
      return 'Display name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9\s-_]+$/.test(name.trim())) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (password && password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const validateConfirmPassword = (confirm) => {
    if (newPassword && confirm !== newPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  // Real-time validation
  useEffect(() => {
    const errors = {};
    
    if (touched.displayName) {
      const nameError = validateDisplayName(displayName);
      if (nameError) errors.displayName = nameError;
    }
    
    if (touched.newPassword) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) errors.newPassword = passwordError;
    }
    
    if (touched.confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword);
      if (confirmError) errors.confirmPassword = confirmError;
    }
    
    setValidationErrors(errors);
  }, [displayName, newPassword, confirmPassword, touched]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Mark fields as touched
    setTouched(prev => ({ ...prev, displayName: true }));
    
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setError('Please fix the errors above before saving');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = {
        displayName: displayName.trim(),
        isPublic: isPublic,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'userProfiles', user.uid), updatedData);
      
      setSuccess('Profile updated successfully!');
      
      // Notify parent component
      if (onProfileUpdated) {
        onProfileUpdated({ ...userProfile, ...updatedData });
      }
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    }

    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    setTouched(prev => ({ 
      ...prev, 
      currentPassword: true, 
      newPassword: true, 
      confirmPassword: true 
    }));
    
    const passwordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(confirmPassword);
    
    if (passwordError || confirmError) {
      setError('Please fix the password errors above');
      return;
    }

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched({});
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else {
        setError('Failed to change password. Please try again.');
      }
    }

    setLoading(false);
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    if (!deletePassword) {
      setError('Password is required to delete account');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      // Delete user data from Firestore
      const batch = writeBatch(db);
      
      // Delete user profile
      batch.delete(doc(db, 'userProfiles', user.uid));
      
      // Delete user's recipes
      const recipesQuery = query(collection(db, 'recipes'), where('createdBy', '==', user.uid));
      const recipesSnapshot = await getDocs(recipesQuery);
      recipesSnapshot.forEach((recipeDoc) => {
        batch.delete(recipeDoc.ref);
      });
      
      // Delete follow relationships
      const followersQuery = query(collection(db, 'follows'), where('followerId', '==', user.uid));
      const followingQuery = query(collection(db, 'follows'), where('followingId', '==', user.uid));
      
      const [followersSnapshot, followingSnapshot] = await Promise.all([
        getDocs(followersQuery),
        getDocs(followingQuery)
      ]);
      
      followersSnapshot.forEach((followDoc) => {
        batch.delete(followDoc.ref);
      });
      
      followingSnapshot.forEach((followDoc) => {
        batch.delete(followDoc.ref);
      });
      
      // Commit all deletions
      await batch.commit();
      
      // Delete Firebase Auth user
      await deleteUser(user);
      
      // Notify parent component
      if (onAccountDeleted) {
        onAccountDeleted();
      }
      
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Password is incorrect');
      } else {
        setError('Failed to delete account. Please try again.');
      }
    }

    setLoading(false);
  };

  const sections = [
    { id: 'profile', label: 'Profile Info', emoji: '👤' },
    { id: 'privacy', label: 'Privacy', emoji: '🔒' },
    { id: 'password', label: 'Password', emoji: '🔑' },
    { id: 'danger', label: 'Delete Account', emoji: '⚠️' }
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 40px 60px 40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%'
        }} />
        
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '12px 20px',
            marginBottom: '30px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <span>←</span> Back
        </button>
        
        {/* Title */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{
            color: 'white',
            fontSize: '3rem',
            fontWeight: '800',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            lineHeight: '1.1'
          }}>
            Profile Settings
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '400'
          }}>
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Success/Error Messages */}
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ color: '#15803d', fontSize: '0.95rem', fontWeight: '500' }}>
              {success}
            </span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontSize: '0.95rem', fontWeight: '500' }}>
              {error}
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '30px',
          background: 'white',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                flex: '1',
                minWidth: '140px',
                padding: '12px 16px',
                background: activeSection === section.id 
                  ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                  : 'transparent',
                color: activeSection === section.id ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.target.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <span>{section.emoji}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Profile Info Section */}
        {activeSection === 'profile' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{
              color: '#1a202c',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>👤</span>
              Profile Information
            </h3>

            <form onSubmit={handleProfileUpdate}>
              {/* Display Name */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, displayName: true }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: touched.displayName && validationErrors.displayName 
                      ? '2px solid #ef4444' 
                      : touched.displayName && !validationErrors.displayName && displayName.trim()
                        ? '2px solid #10b981'
                        : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: touched.displayName && validationErrors.displayName 
                      ? '#fef2f2' 
                      : touched.displayName && !validationErrors.displayName && displayName.trim()
                        ? '#f0fdf4'
                        : '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                {touched.displayName && validationErrors.displayName && (
                  <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.displayName}
                  </span>
                )}
              </div>

              {/* Email (read-only) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  Email cannot be changed
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || (touched.displayName && validationErrors.displayName)}
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  background: (loading || (touched.displayName && validationErrors.displayName))
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (loading || (touched.displayName && validationErrors.displayName)) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === 'privacy' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{
              color: '#1a202c',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>🔒</span>
              Privacy Settings
            </h3>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>
                    {isPublic ? '🌍' : '🔒'}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#1a202c',
                      marginBottom: '4px'
                    }}>
                      {isPublic ? 'Public Profile' : 'Private Profile'}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#64748b'
                    }}>
                      {isPublic 
                        ? 'Anyone can find and follow you immediately' 
                        : 'People need to send follow requests for approval'
                      }
                    </div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  style={{
                    width: '60px',
                    height: '32px',
                    borderRadius: '16px',
                    border: 'none',
                    background: isPublic 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                      : 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: isPublic
                      ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                      : '0 2px 6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    background: 'white',
                    position: 'absolute',
                    top: '4px',
                    left: isPublic ? '32px' : '4px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}>
                    {isPublic ? '🌍' : '🔒'}
                  </div>
                </button>
              </div>
              
              <div style={{
                background: isPublic 
                  ? 'linear-gradient(135deg, #667eea10, #764ba210)' 
                  : 'linear-gradient(135deg, #f1f5f910, #e2e8f010)',
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${isPublic ? '#667eea30' : '#e2e8f0'}`
              }}>
                <h4 style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  {isPublic ? 'Public Profile Benefits:' : 'Private Profile Benefits:'}
                </h4>
                <ul style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  lineHeight: '1.5',
                  margin: 0,
                  paddingLeft: '20px'
                }}>
                  {isPublic ? (
                    <>
                      <li>People can find you easily by searching your email</li>
                      <li>No approval needed for new followers</li>
                      <li>Faster growth of your recipe network</li>
                      <li>More exposure for your recipes</li>
                    </>
                  ) : (
                    <>
                      <li>You control who can follow you</li>
                      <li>Manual approval for all follow requests</li>
                      <li>Better privacy and security</li>
                      <li>Curated audience for your recipes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <button
              onClick={handleProfileUpdate}
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{
              color: '#1a202c',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>🔑</span>
              Change Password
            </h3>

            <form onSubmit={handlePasswordChange}>
              {/* Current Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, currentPassword: true }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlurCapture={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, newPassword: true }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: touched.newPassword && validationErrors.newPassword 
                      ? '2px solid #ef4444' 
                      : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: touched.newPassword && validationErrors.newPassword ? '#fef2f2' : '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlurCapture={(e) => e.target.style.borderColor = touched.newPassword && validationErrors.newPassword ? '#ef4444' : '#e2e8f0'}
                />
                {touched.newPassword && validationErrors.newPassword && (
                  <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.newPassword}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: touched.confirmPassword && validationErrors.confirmPassword 
                      ? '2px solid #ef4444' 
                      : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: touched.confirmPassword && validationErrors.confirmPassword ? '#fef2f2' : '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlurCapture={(e) => e.target.style.borderColor = touched.confirmPassword && validationErrors.confirmPassword ? '#ef4444' : '#e2e8f0'}
                />
                {touched.confirmPassword && validationErrors.confirmPassword && (
                  <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || Object.keys(validationErrors).length > 0 || !currentPassword || !newPassword || !confirmPassword}
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  background: (loading || Object.keys(validationErrors).length > 0 || !currentPassword || !newPassword || !confirmPassword)
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (loading || Object.keys(validationErrors).length > 0 || !currentPassword || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Danger Zone - Account Deletion */}
        {activeSection === 'danger' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            border: '2px solid #fecaca',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
          }}>
            <h3 style={{
              color: '#dc2626',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>⚠️</span>
              Danger Zone
            </h3>

            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #fecaca',
              marginBottom: '24px'
            }}>
              <h4 style={{
                color: '#dc2626',
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                Delete Account
              </h4>
              <p style={{
                color: '#7f1d1d',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                margin: '0 0 16px 0'
              }}>
                <strong>This action cannot be undone.</strong> This will permanently delete your account, all your recipes, and remove you from all follower relationships.
              </p>
              
              <div style={{
                background: '#fef2f2',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #fca5a5'
              }}>
                <p style={{
                  color: '#7f1d1d',
                  fontSize: '0.85rem',
                  margin: '0 0 8px 0',
                  fontWeight: '600'
                }}>
                  What will be deleted:
                </p>
                <ul style={{
                  color: '#7f1d1d',
                  fontSize: '0.8rem',
                  margin: 0,
                  paddingLeft: '16px'
                }}>
                  <li>Your user profile and account</li>
                  <li>All recipes you've created</li>
                  <li>All follow relationships (followers and following)</li>
                  <li>Your authentication credentials</li>
                </ul>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                }}
              >
                Delete My Account
              </button>
            ) : (
              <div style={{
                background: '#fef2f2',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #fca5a5'
              }}>
                <h4 style={{
                  color: '#dc2626',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  margin: '0 0 16px 0'
                }}>
                  Confirm Account Deletion
                </h4>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#7f1d1d',
                    marginBottom: '8px'
                  }}>
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '1rem',
                      border: '2px solid #fca5a5',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#7f1d1d',
                    marginBottom: '8px'
                  }}>
                    Enter your password:
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '1rem',
                      border: '2px solid #fca5a5',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmation('');
                      setDeletePassword('');
                    }}
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccountDeletion}
                    disabled={loading || deleteConfirmation !== 'DELETE' || !deletePassword}
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      background: (loading || deleteConfirmation !== 'DELETE' || !deletePassword)
                        ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (loading || deleteConfirmation !== 'DELETE' || !deletePassword) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? 'Deleting Account...' : 'Delete Account Forever'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;