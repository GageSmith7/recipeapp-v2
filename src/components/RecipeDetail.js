import React, { useState } from 'react';
import { doc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import EmailExportModal from './EmailExportModal';

const RecipeDetail = ({ recipe, onBack, onEdit, user, readOnly }) => {

  const [duplicating, setDuplicating] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  if (!recipe) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#64748b',
        fontSize: '1.1rem'
      }}>
        Recipe not found
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'recipes', recipe.id));
        console.log('Recipe deleted successfully');
        onBack();
      } catch (error) {
        console.error('Error deleting recipe: ', error);
        alert('Failed to delete recipe. Please try again.');
      }
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
        const duplicateRecipe = {
            title: `Copy of ${recipe.title}`,
            ingredients: [...recipe.ingredients],
            instructions: recipe.instructions,
            category: recipe.category,
            visibility: 'private', // Default duplicates to private
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            photo: recipe.photo
        };

        await addDoc(collection(db, 'recipes'), duplicateRecipe);
        setDuplicateSuccess(true);
        setTimeout(() => {
            setDuplicateSuccess(false);
            onBack();
          }, 2000);
    } catch (error) {
        console.error('error duplicating recipe: ', error);
        alert('Failed to dupliacte recipe. Please try again later.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const savedRecipe = {
            title: `${recipe.title} (from ${recipe.creatorInfo?.displayName || 'friend'})`,
            ingredients: [...recipe.ingredients],
            instructions: recipe.instructions,
            category: recipe.category,
            visibility: 'private', // Default duplicates to private
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            originalRecipeId: recipe.id,
            originalCreator: recipe.createdBy,
        };

        await addDoc(collection(db, 'recipes'), savedRecipe);
        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            onBack();
          }, 2000);
    } catch (error) {
        console.error('error saving recipe: ', error);
        alert('Failed to save recipe. Please try again later.');
    }
  };

  // Get recipe color based on title (same logic as RecipeCard)
  const getRecipeColor = (title) => {
    const colors = [
      '#667eea', // Soft blue
      '#764ba2', // Soft purple
      '#f093fb', // Soft pink
      '#8b5fbf', // Muted purple
      '#6c5ce7', // Soft violet
      '#a29bfe', // Light purple
      '#fd79a8', // Soft rose
      '#e84393', // Muted pink
      '#74b9ff', // Soft sky blue
      '#0984e3', // Professional blue
      '#00b894', // Soft teal
      '#00cec9', // Muted turquoise
      '#fdcb6e', // Soft orange
      '#e17055'  // Muted coral
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      const char = title.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const primaryColor = getRecipeColor(recipe.title);

  // Check if recipe has a photo
  const hasPhoto = recipe.photo && recipe.photo.downloadURL;

  return (
    <div style={{ position: 'relative' }}>
      {/* Hero Header Section with Photo Background */}
      <div style={{
        background: hasPhoto 
          ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3)), url(${recipe.photo.downloadURL})`
          : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '40px 40px 80px 40px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: hasPhoto ? '400px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: hasPhoto ? 'space-between' : 'flex-start'
      }}>
        {/* Background decorations (only show if no photo) */}
        {!hasPhoto && (
          <>
            <div style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-50px',
              left: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%'
            }} />
          </>
        )}
        
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '12px 20px',
            marginBottom: hasPhoto ? '0' : '30px',
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
            gap: '8px',
            alignSelf: 'flex-start'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <span>←</span> Back to Recipes
        </button>

        {/* Recipe title only - positioned at bottom if photo exists */}
        <div style={{ 
          position: 'relative', 
          zIndex: 10,
          marginTop: hasPhoto ? 'auto' : '0'
        }}>
          {/* Just the title now */}
          <h1 style={{
            color: 'white',
            fontSize: hasPhoto ? '3.5rem' : '3rem',
            fontWeight: '800',
            margin: 0,
            textShadow: hasPhoto 
              ? '0 4px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' 
              : '0 2px 4px rgba(0,0,0,0.2)',
            lineHeight: '1.1'
          }}>
            {recipe.title}
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Recipe Metadata Tags - moved here from header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '40px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}10)`,
              padding: '16px 24px',
              borderRadius: '12px',
              border: `1px solid ${primaryColor}25`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '120px'
            }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '500' }}>
                Created
              </div>
              <div style={{ color: '#1a202c', fontSize: '1rem', fontWeight: '600' }}>
                {recipe.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) || 'Recently'}
              </div>
            </div>
            
            <div style={{
              background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}10)`,
              padding: '16px 24px',
              borderRadius: '12px',
              border: `1px solid ${primaryColor}25`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '120px'
            }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '500' }}>
                Serving Size
              </div>
              <div style={{ color: '#1a202c', fontSize: '1rem', fontWeight: '600' }}>
                {recipe.servingSize || '1'}
              </div>
            </div>
            
            <div style={{
              background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}10)`,
              padding: '16px 24px',
              borderRadius: '12px',
              border: `1px solid ${primaryColor}25`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '120px'
            }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '500' }}>
                Ingredients
              </div>
              <div style={{ color: '#1a202c', fontSize: '1rem', fontWeight: '600' }}>
                {recipe.ingredients?.length || 0} items
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}10)`,
              padding: '16px 24px',
              borderRadius: '12px',
              border: `1px solid ${primaryColor}25`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '120px'
            }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '500' }}>
                Category
              </div>
              <div style={{ color: '#1a202c', fontSize: '1rem', fontWeight: '600' }}>
                {getCategoryEmoji(recipe.category)} {getCategoryLabel(recipe.category)}
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients Section */}
        <div style={{ marginBottom: '50px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🥘
            </div>
            <h2 style={{
              color: '#1a202c',
              fontSize: '1.8rem',
              fontWeight: '700',
              margin: 0
            }}>
              Ingredients
            </h2>
          </div>
          
          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = primaryColor + '40';
                      e.target.style.boxShadow = `0 4px 12px ${primaryColor}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: primaryColor,
                      borderRadius: '50%',
                      flexShrink: 0
                    }} />
                    <span style={{
                      color: '#374151',
                      fontSize: '0.95rem',
                      lineHeight: '1.4'
                    }}>
                      {ingredient}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📝</span>
              <p style={{ fontStyle: 'italic', color: '#64748b', margin: 0, fontSize: '1rem' }}>
                No ingredients listed
              </p>
            </div>
          )}
        </div>

        {/* Instructions Section */}
        <div style={{ marginBottom: '50px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📋
            </div>
            <h2 style={{
              color: '#1a202c',
              fontSize: '1.8rem',
              fontWeight: '700',
              margin: 0
            }}>
              Instructions
            </h2>
          </div>
          
          {recipe.instructions ? (
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                color: '#374151',
                fontSize: '1.1rem',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap'
              }}>
                {recipe.instructions}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>✍️</span>
              <p style={{ fontStyle: 'italic', color: '#64748b', margin: 0, fontSize: '1rem' }}>
                No instructions provided
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!readOnly ? (
        <div style={{
          display: 'flex',
          gap: '16px',
          paddingTop: '30px',
          borderTop: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => onEdit(recipe)}
            style={{
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: '600',
              background: `royalBlue`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${primaryColor}30`,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = `0 8px 25px ${primaryColor}40`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 4px 16px ${primaryColor}30`;
            }}
          >
            <span>✏️</span>
            Edit Recipe
          </button>

          <button
            onClick={handleDuplicate}
            disabled={duplicating || duplicateSuccess}
            style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                background: duplicateSuccess 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : duplicating 
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (duplicating || duplicateSuccess) ? 'not-allowed' : 'pointer',
                boxShadow: (duplicating || duplicateSuccess)
                ? 'none'
                : '0 4px 16px rgba(34, 197, 94, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}
            onMouseEnter={(e) => {
                if (!duplicating && !duplicateSuccess) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                }
            }}
            onMouseLeave={(e) => {
                if (!duplicating && !duplicateSuccess) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.3)';
                }
            }}
            >
            {duplicateSuccess ? (
                <>
            <span>✅</span>
             Recipe Duplicated!
            </>
            ) : duplicating ? (
                <>
                <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                Duplicating...
                </>
            ) : (
                <>
                <span>📋</span>
                Duplicate Recipe
                </>
            )}
            </button>

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.3)';
            }}
          >
            <span>📧</span>
            Share via Email
          </button>
          
          <button
            onClick={handleDelete}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.3)';
            }}
          >
            <span>🗑️</span>
            Delete Recipe
          </button>
        </div> ) : (
            <div style={{
              display: 'flex',
              gap: '16px',
              paddingTop: '30px',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
                <button
            onClick={handleSave}
            disabled={saving || saveSuccess}
            style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                background: saveSuccess 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : saving 
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (saving || saveSuccess) ? 'not-allowed' : 'pointer',
                boxShadow: (saving || saveSuccess)
                ? 'none'
                : '0 4px 16px rgba(34, 197, 94, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}
            onMouseEnter={(e) => {
                if (!saving && !saveSuccess) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                }
            }}
            onMouseLeave={(e) => {
                if (!saving && !saveSuccess) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.3)';
                }
            }}
            >
            {saveSuccess ? (
                <>
            <span>✅</span>
             Recipe Saved!
            </>
            ) : saving ? (
                <>
                <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                Saving...
                </>
            ) : (
                <>
                <span>📋</span>
                Save This Recipe
                </>
            )}
            </button>

            {/* Export Button for Read-Only Mode */}
            <button
              onClick={() => setShowExportModal(true)}
              style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.3)';
              }}
            >
              <span>📧</span>
              Share via Email
            </button>
            </div>
        )}
      </div>

      {/* Email Export Modal */}
      <EmailExportModal
        recipe={recipe}
        user={user}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

// Helper function to get category emoji
function getCategoryEmoji(category) {
  const categoryMap = {
    breakfast: '🌅',
    lunch: '🥙', 
    dinner: '🍽️',
    snack: '🍿',
    dessert: '🍰'
  };
  return categoryMap[category] || '🍽️';
}

// Helper function to get category label
function getCategoryLabel(category) {
  const labelMap = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner', 
    snack: 'Snack',
    dessert: 'Dessert'
  };
  return labelMap[category] || 'Dinner';
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default RecipeDetail;