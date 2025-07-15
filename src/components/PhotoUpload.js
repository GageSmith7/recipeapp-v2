import React, { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

const PhotoUpload = ({ 
  photo = null, 
  maxPhotos = 1, 
  onPhotoChange, 
  mode = 'upload',
  allowReplace = true,
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  userId, // Required for creating user-specific paths
  recipeId = null, // Optional - for organizing photos by recipe
  storagePath = 'recipe-photos' // Customizable storage path
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState(photo);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedPhotoData, setUploadedPhotoData] = useState(null);
  const fileInputRef = useRef(null);
  const fileReaderRef = useRef(null);

  // Cleanup FileReader on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
      }
    };
  }, []);

  // Initialize with existing photo data if provided
  useEffect(() => {
    if (photo && typeof photo === 'object' && photo.downloadURL) {
      setUploadedPhotoData(photo);
      setPhotoPreview({
        url: photo.downloadURL,
        name: photo.name || 'Recipe Photo',
        size: photo.size || 0,
        type: photo.type || 'image/jpeg'
      });
      setSelectedPhoto(photo);
    }
  }, [photo]);

  // Generate unique filename with timestamp
  const generateFileName = (originalFile) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = originalFile.name.split('.').pop();
    return `${timestamp}_${randomId}.${fileExtension}`;
  };

  // Create storage path for the file
  const createStoragePath = (fileName) => {
    const basePath = `${storagePath}/${userId}`;
    if (recipeId) {
      return `${basePath}/${recipeId}/${fileName}`;
    }
    return `${basePath}/${fileName}`;
  };

  // File validation function
  const validateFile = (file) => {
    console.log('Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      maxSizeBytes: maxSizeMB * 1024 * 1024
    });

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes.map(type => 
        type.split('/')[1].toUpperCase()
      ).join(', ');
      return {
        isValid: false,
        error: `Invalid file type. Please use: ${allowedExtensions}`
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File too large. Maximum size is ${maxSizeMB} MB (${(file.size / 1024 / 1024).toFixed(1)} MB selected)`
      };
    }

    // Check if file is actually an image by trying to create image object
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        console.log('Image validation successful:', {
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        resolve({
          isValid: true,
          dimensions: {
            width: img.naturalWidth,
            height: img.naturalHeight
          }
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.log('Image validation failed - not a valid image');
        resolve({
          isValid: false,
          error: 'File is not a valid image or is corrupted'
        });
      };
      
      img.src = objectUrl;
    });
  };

  // Generate preview thumbnail using FileReader
  const generatePreview = (file) => {
    return new Promise((resolve, reject) => {
      // Abort any existing FileReader operation
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
      }

      const reader = new FileReader();
      fileReaderRef.current = reader;

      reader.onload = (e) => {
        console.log('FileReader successful, preview generated');
        const preview = {
          url: e.target.result,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type
        };
        resolve(preview);
      };

      reader.onerror = (e) => {
        console.error('FileReader error:', e);
        reject(new Error('Failed to read file for preview'));
      };

      reader.onabort = () => {
        console.log('FileReader aborted');
        reject(new Error('File reading was aborted'));
      };

      // Read file as data URL for preview
      reader.readAsDataURL(file);
    });
  };

  // Upload file to Firebase Storage
  const uploadToFirebase = async (file, validation) => {
    if (!userId) {
      throw new Error('User ID is required for photo upload');
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename and storage path
      const fileName = generateFileName(file);
      const fullPath = createStoragePath(fileName);
      
      console.log('Uploading to Firebase Storage:', {
        fileName,
        fullPath,
        fileSize: file.size
      });

      // Create storage reference
      const storageRef = ref(storage, fullPath);
      
      // Add metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          ...(validation.dimensions && {
            width: validation.dimensions.width.toString(),
            height: validation.dimensions.height.toString()
          })
        }
      };

      // Upload file
      console.log('Starting Firebase upload...');
      const uploadResult = await uploadBytes(storageRef, file, metadata);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log('Firebase upload successful:', {
        downloadURL,
        fullPath: uploadResult.ref.fullPath
      });

      const uploadedData = {
        downloadURL,
        fileName,
        fullPath: uploadResult.ref.fullPath,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        ...validation.dimensions && { dimensions: validation.dimensions }
      };

      setUploadedPhotoData(uploadedData);
      setUploadProgress(100);
      
      return uploadedData;
      
    } catch (error) {
      console.error('Firebase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete photo from Firebase Storage
  const deleteFromFirebase = async (photoData) => {
    if (!photoData || !photoData.fullPath) {
      console.log('No photo data or path provided for deletion');
      return;
    }

    try {
      console.log('Deleting from Firebase Storage:', photoData.fullPath);
      const storageRef = ref(storage, photoData.fullPath);
      await deleteObject(storageRef);
      console.log('Photo deleted from Firebase Storage successfully');
    } catch (error) {
      console.error('Error deleting photo from Firebase:', error);
      // Don't throw error here - we still want to clear local state
      // even if Firebase deletion fails
    }
  };

  // Handle file processing with validation, preview generation, and upload
  const handleFile = async (file) => {
    console.log('Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Basic validation (synchronous)
      const basicValidation = validateFile(file);
      
      // If validation returns a promise (for image validation), await it
      const validation = basicValidation instanceof Promise 
        ? await basicValidation 
        : basicValidation;

      if (!validation.isValid) {
        setError(validation.error);
        setIsLoading(false);
        return;
      }

      // Step 2: Generate preview thumbnail
      const preview = await generatePreview(file);
      
      // Step 3: Update local state first
      setSelectedPhoto(file);
      setPhotoPreview(preview);

      // Step 4: Upload to Firebase Storage
      const uploadedData = await uploadToFirebase(file, validation);
      
      // Step 5: Update preview with Firebase URL
      setPhotoPreview(prev => ({
        ...prev,
        url: uploadedData.downloadURL // Replace data URL with Firebase URL
      }));
      
      // Step 6: Notify parent component with uploaded data
      if (onPhotoChange) {
        onPhotoChange(uploadedData, preview);
      }

      console.log('File processing and upload complete:', {
        file: file.name,
        uploaded: !!uploadedData.downloadURL,
        dimensions: validation.dimensions
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setError(error.message || 'Failed to process and upload file');
      
      // Clean up on error
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setUploadedPhotoData(null);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  // Handle file selection from input
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    console.log('File selected from input:', file);
    
    if (file) {
      handleFile(file);
    }
  };

  // Handle drag and drop events
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    console.log('Files dropped:', files);
    
    if (files.length > 0) {
      await handleFile(files[0]); // Only take first file since maxPhotos = 1
    }
  };

  // Handle remove photo with cleanup (including Firebase deletion)
  const handleRemovePhoto = async () => {
    console.log('Removing photo and cleaning up');
    
    setIsLoading(true);
    
    try {
      // Delete from Firebase Storage if we have uploaded data
      if (uploadedPhotoData) {
        await deleteFromFirebase(uploadedPhotoData);
      }
      
      // Clean up FileReader if running
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
      }

      // Clean up preview URL if it exists and is a blob URL
      if (photoPreview && photoPreview.url && photoPreview.url.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview.url);
      }

      // Reset state
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setUploadedPhotoData(null);
      setError(null);
      setUploadProgress(0);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      if (onPhotoChange) {
        onPhotoChange(null);
      }
      
    } catch (error) {
      console.error('Error removing photo:', error);
      setError('Failed to remove photo completely');
    } finally {
      setIsLoading(false);
    }
  };

  // Open file browser
  const openFileBrowser = () => {
    console.log('Opening file browser');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // View mode - just display existing photo
  if (mode === 'view' && (photo || photoPreview)) {
    return (
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea20, #764ba220)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            📸
          </div>
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: 0
          }}>
            Recipe Photo
          </h3>
        </div>
        
        <div style={{
          width: '100%',
          height: '200px',
          background: '#e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {photoPreview ? (
            <img
              src={photoPreview.url}
              alt="Recipe"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <span style={{ fontSize: '48px' }}>📷</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e2e8f0'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #667eea20, #764ba220)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          📸
        </div>
        <div>
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: '0 0 2px 0'
          }}>
            Recipe Photo
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: '0.85rem',
            margin: 0
          }}>
            {selectedPhoto ? 'Photo uploaded' : `Add a photo to showcase your recipe (max ${maxPhotos})`}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error Display */}
      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{
            color: '#dc2626',
            fontSize: '0.9rem',
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            {error}
          </span>
        </div>
      )}

      {/* Loading/Upload State */}
      {(isLoading || isUploading) && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #10b981',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ flex: 1 }}>
            <span style={{
              color: '#059669',
              fontSize: '0.9rem',
              fontWeight: '500',
              display: 'block',
              marginBottom: '4px'
            }}>
              {isUploading ? 'Uploading to cloud storage...' : 'Processing photo...'}
            </span>
            {isUploading && (
              <div style={{
                width: '100%',
                height: '4px',
                background: '#dcfce7',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo preview or upload area */}
      {selectedPhoto && photoPreview ? (
        /* Photo Preview Section */
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Image Preview */}
          <div style={{
            width: '100%',
            height: '200px',
            background: '#e2e8f0',
            borderRadius: '8px',
            marginBottom: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img
              src={photoPreview.url}
              alt={`Preview of ${photoPreview.name}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                console.error('Image preview failed to load');
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            
            {/* Fallback if image fails to load */}
            <div style={{
              display: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              background: '#e2e8f0'
            }}>
              ❌
            </div>
            
            {/* Upload status indicator */}
            {uploadedPhotoData && (
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'rgba(16, 185, 129, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>☁️</span>
                Uploaded
              </div>
            )}
            
            {/* Photo info overlay */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '500',
              maxWidth: 'calc(100% - 16px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {photoPreview.name}
            </div>

            {/* File size indicator */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '500'
            }}>
              {formatFileSize(photoPreview.size)}
            </div>
          </div>
          
          {/* Photo Details */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              fontSize: '0.8rem',
              color: '#64748b'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>Type:</strong><br />
                {photoPreview.type.split('/')[1].toUpperCase()}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Size:</strong><br />
                {formatFileSize(photoPreview.size)}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Status:</strong><br />
                <span style={{ 
                  color: uploadedPhotoData ? '#10b981' : '#f59e0b',
                  fontWeight: '600'
                }}>
                  {uploadedPhotoData ? '☁️ Uploaded' : '📱 Local'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Photo actions */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            {allowReplace && (
              <button
                onClick={openFileBrowser}
                disabled={isLoading || isUploading}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  background: (isLoading || isUploading)
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isLoading || isUploading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: (isLoading || isUploading) ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && !isUploading) {
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && !isUploading) {
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                🔄 Replace Photo
              </button>
            )}
            
            <button
              onClick={handleRemovePhoto}
              disabled={isLoading || isUploading}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: '500',
                background: (isLoading || isUploading)
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isLoading || isUploading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: (isLoading || isUploading) ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && !isUploading) {
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && !isUploading) {
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              🗑️ Remove Photo
            </button>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            background: isDragOver 
              ? 'linear-gradient(135deg, #667eea10, #764ba210)' 
              : 'white',
            border: isDragOver 
              ? '2px dashed #667eea' 
              : '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: (isLoading || isUploading) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: (isLoading || isUploading) ? 0.7 : 1
          }}
          onClick={(isLoading || isUploading) ? undefined : openFileBrowser}
        >
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: isDragOver ? 1 : 0.6
          }}>
            {(isLoading || isUploading) ? '⏳' : '📁'}
          </div>
          
          <h4 style={{
            color: '#1a202c',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            {(isLoading || isUploading)
              ? 'Processing...' 
              : isDragOver 
                ? 'Drop your photo here' 
                : 'Add a photo'
            }
          </h4>
          
          <p style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0 0 16px 0',
            lineHeight: '1.4'
          }}>
            {(isLoading || isUploading)
              ? 'Please wait while we process and upload your photo'
              : isDragOver 
                ? 'Release to upload your photo'
                : 'Drag and drop a photo here, or click to browse files'
            }
          </p>
          
          {!(isLoading || isUploading) && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Camera button clicked');
                  openFileBrowser();
                }}
                style={{
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <span>📷</span>
                Take Photo
              </button>
            </div>
          )}
          
          {/* File requirements */}
          <div style={{
            marginTop: '16px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #f1f5f910, #e2e8f010)',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{
              color: '#64748b',
              fontSize: '0.8rem',
              margin: 0,
              lineHeight: '1.3'
            }}>
              Supported: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • Max size: {maxSizeMB} MB
            </p>
          </div>
        </div>
      )}

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default PhotoUpload;