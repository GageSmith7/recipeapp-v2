import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const RecipeForm = ({ user, recipe, onCancel, onSave }) => {
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('dinner');
  const [visibility, setVisibility] = useState('private');
  const [servingSize, setServingSize] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  // Validation states
  const [touched, setTouched] = useState({
    title: false,
    ingredients: false,
    instructions: false
  });
  const [validationErrors, setValidationErrors] = useState({});

  const isEditing = !!recipe;

  //meal categories
  const mealCategories = [
    { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'lunch', label: 'Lunch', emoji: '🥙' },
    { value: 'dinner', label: 'Dinner', emoji: '🍽️' },
    { value: 'snack', label: 'Snack', emoji: '🍿' },
    { value: 'dessert', label: 'Dessert', emoji: '🍰' },
    { value: 'cocktail', label: 'Cocktail', emoji: '🍸'}
  ];

  // Populate form when editing
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setIngredients(recipe.ingredients ? recipe.ingredients.join('\n') : '');
      setInstructions(recipe.instructions || '');
      setCategory(recipe.category || 'dinner');
      setVisibility(recipe.visibility || 'private');
      setServingSize(recipe.servingSize || '1');
    }
  }, [recipe]);

  // Validation function
  const validateForm = () => {
    const errors = {};
    
    // Title validation
    if (!title.trim()) {
      errors.title = 'Recipe title is required';
    } else if (title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    // Ingredients validation
    if (!ingredients.trim()) {
      errors.ingredients = 'At least one ingredient is required';
    } else {
      const ingredientArray = ingredients
        .split('\n')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 0);
      
      if (ingredientArray.length === 0) {
        errors.ingredients = 'At least one ingredient is required';
      } else if (ingredientArray.length > 50) {
        errors.ingredients = 'Maximum 50 ingredients allowed';
      } else {
        // Check for very short ingredients
        const shortIngredients = ingredientArray.filter(ing => ing.length < 3);
        if (shortIngredients.length > 0) {
          errors.ingredients = 'Some ingredients seem too short. Consider adding quantities (e.g., "1 cup flour")';
        }
      }
    }

    // Instructions validation (optional but with limits)
    if (instructions.trim().length > 2000) {
      errors.instructions = 'Instructions must be less than 2000 characters';
    }

    return errors;
  };

  // Real-time validation
  useEffect(() => {
    const errors = validateForm();
    setValidationErrors(errors);
  }, [title, ingredients, instructions]);

  // Check if form is valid
  const isFormValid = Object.keys(validationErrors).length === 0 && title.trim() && ingredients.trim();

  // Handle field blur (when user leaves a field)
  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  // Get field styling based on validation state
  const getFieldStyle = (fieldName, baseStyle) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];
    const isValid = touched[fieldName] && !validationErrors[fieldName] && 
                   ((fieldName === 'title' && title.trim()) || 
                    (fieldName === 'ingredients' && ingredients.trim()) ||
                    (fieldName === 'instructions'));

    return {
      ...baseStyle,
      border: hasError ? '2px solid #ef4444' : isValid ? '2px solid #10b981' : '2px solid #e2e8f0',
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      background: hasError ? '#fef2f2' : isValid ? '#f0fdf4' : '#ffffff'
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ title: true, ingredients: true, instructions: true });
    
    // Final validation check
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors above before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert ingredients from text to array (split by new lines)
      const ingredientArray = ingredients
        .split('\n')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 0);

      if (isEditing) {
        // Update existing recipe
        const recipeData = {
          title: title.trim(),
          ingredients: ingredientArray,
          instructions: instructions.trim(),
          category: category,
          visibility: visibility,
          servingSize: servingSize,
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'recipes', recipe.id), recipeData);
        console.log('Recipe updated successfully!');
      } else {
        // Create new recipe
        const recipeData = {
          title: title.trim(),
          ingredients: ingredientArray,
          instructions: instructions.trim(),
          category: category,
          visibility: visibility,
          servingSize: servingSize,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'recipes'), recipeData);
        console.log('Recipe saved successfully!');
      }
      
      // Reset form
      setTitle('');
      setIngredients('');
      setInstructions('');
      setCategory('dinner');
      setVisibility('private');
      setServingSize('1');
      
      if (onSave) onSave();
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      setError('Failed to save recipe. Please try again.');
    }

    setLoading(false);
  };

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
          onClick={onCancel}
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
          <span>←</span> Back to Recipes
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
            {isEditing ? 'Edit Recipe' : 'Create New Recipe'}
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '400'
          }}>
            {isEditing 
              ? 'Update your recipe with new ingredients or instructions' 
              : 'Share your culinary masterpiece with detailed ingredients and steps'
            }
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div style={{ padding: '40px' }}>
        <form onSubmit={handleSubmit}>
          {/* Recipe Title Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>🍽️</span>
              Recipe Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Enter a delicious recipe name..."
              style={getFieldStyle('title', {
                width: '100%',
                padding: '16px 20px',
                fontSize: '1.1rem',
                fontWeight: '500',
                outline: 'none',
                boxSizing: 'border-box'
              })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {touched.title && validationErrors.title && (
                <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {validationErrors.title}
                </span>
              )}
              {touched.title && !validationErrors.title && title.trim() && (
                <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✅</span> Looks great!
                </span>
              )}
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: 'auto' }}>
                {title.length}/100
              </span>
            </div>
          </div>

          {/* Meal Category Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>🏷️</span>
              Meal Category *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {mealCategories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: '16px 12px',
                    background: category === cat.value 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                      : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                    color: category === cat.value ? 'white' : '#64748b',
                    border: category === cat.value 
                      ? '2px solid #667eea' 
                      : '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (category !== cat.value) {
                      e.target.style.background = 'linear-gradient(135deg, #e2e8f0, #cbd5e1)';
                      e.target.style.borderColor = '#94a3b8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (category !== cat.value) {
                      e.target.style.background = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✅</span> {mealCategories.find(cat => cat.value === category)?.label} selected
              </span>
            </div>
          </div>

          {/* Visibility/Privacy Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>{visibility === 'public' ? '🌍' : '🔒'}</span>
              Recipe Visibility
            </label>
            
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Toggle Switch */}
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
                  <span style={{ fontSize: '20px' }}>
                    {visibility === 'public' ? '🌍' : '🔒'}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1a202c',
                      marginBottom: '2px'
                    }}>
                      {visibility === 'public' ? 'Public Recipe' : 'Private Recipe'}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#64748b'
                    }}>
                      {visibility === 'public' 
                        ? 'Visible to your friends and collaborators' 
                        : 'Only visible to you'
                      }
                    </div>
                  </div>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
                  style={{
                    width: '60px',
                    height: '32px',
                    borderRadius: '16px',
                    border: 'none',
                    background: visibility === 'public' 
                      ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                      : 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: visibility === 'public'
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
                    left: visibility === 'public' ? '32px' : '4px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}>
                    {visibility === 'public' ? '🌍' : '🔒'}
                  </div>
                </button>
              </div>

              
              
              {/* Additional Info */}
              <div style={{
                background: visibility === 'public' 
                  ? 'linear-gradient(135deg, #667eea10, #764ba210)' 
                  : 'linear-gradient(135deg, #f1f5f910, #e2e8f010)',
                borderRadius: '8px',
                padding: '12px',
                border: `1px solid ${visibility === 'public' ? '#667eea30' : '#e2e8f0'}`
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  lineHeight: '1.4'
                }}>
                  {visibility === 'public' ? (
                    <>
                      <strong style={{ color: '#667eea' }}>Public recipes</strong> can be seen by friends you've connected with and in any collaborations you join. You can change this anytime.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#64748b' }}>Private recipes</strong> are only visible in your personal recipe collection. Perfect for family secrets or works in progress!
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>🥘</span>
              Ingredients * (one per line)
            </label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              onBlur={() => handleBlur('ingredients')}
              placeholder="1 cup all-purpose flour&#10;2 large eggs&#10;1 tsp vanilla extract&#10;1/2 cup sugar"
              rows="8"
              style={getFieldStyle('ingredients', {
                width: '100%',
                padding: '16px 20px',
                fontSize: '1rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                {touched.ingredients && validationErrors.ingredients && (
                  <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ marginTop: '2px' }}>⚠️</span> 
                    <span>{validationErrors.ingredients}</span>
                  </span>
                )}
                {touched.ingredients && !validationErrors.ingredients && ingredients.trim() && (
                  <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✅</span> {ingredients.split('\n').filter(i => i.trim()).length} ingredients added
                  </span>
                )}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {ingredients.split('\n').filter(i => i.trim()).length}/50 ingredients
              </span>
            </div>
          </div>

          {/* Instructions Field */}
          <div style={{ marginBottom: '40px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>📋</span>
              Cooking Instructions (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={() => handleBlur('instructions')}
              placeholder="1. Preheat your oven to 350°F (175°C)&#10;2. In a large bowl, mix the dry ingredients...&#10;3. Add wet ingredients and stir until combined&#10;4. Bake for 25-30 minutes until golden brown"
              rows="8"
              style={getFieldStyle('instructions', {
                width: '100%',
                padding: '16px 20px',
                fontSize: '1rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {touched.instructions && validationErrors.instructions && (
                <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {validationErrors.instructions}
                </span>
              )}
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: 'auto' }}>
                {instructions.length}/2000 characters
              </span>
            </div>
          </div>

          {/* Serving Size Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              <span>👥</span>
              Serving Size
            </label>
            
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
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
                  <span style={{ fontSize: '20px' }}>🍽️</span>
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1a202c',
                      marginBottom: '2px'
                    }}>
                      Number of Servings
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#64748b'
                    }}>
                      How many people will this recipe serve?
                    </div>
                  </div>
                </div>
                
                {/* Serving Size Input with Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  padding: '4px'
                }}>
                  {/* Decrease Button */}
                  <button
                    type="button"
                    onClick={() => setServingSize(Math.max(1, parseInt(servingSize) - 1).toString())}
                    disabled={parseInt(servingSize) <= 1}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: parseInt(servingSize) <= 1 
                        ? 'linear-gradient(135deg, #f3f4f6, #e5e7eb)' 
                        : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: parseInt(servingSize) <= 1 ? '#9ca3af' : 'white',
                      cursor: parseInt(servingSize) <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (parseInt(servingSize) > 1) {
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (parseInt(servingSize) > 1) {
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    −
                  </button>
                  
                  {/* Serving Size Input */}
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={servingSize}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 50)) {
                        setServingSize(value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 1) {
                        setServingSize('1');
                      } else if (value > 50) {
                        setServingSize('50');
                      }
                    }}
                    style={{
                      width: '60px',
                      height: '36px',
                      textAlign: 'center',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1a202c',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />
                  
                  {/* Increase Button */}
                  <button
                    type="button"
                    onClick={() => setServingSize(Math.min(50, parseInt(servingSize) + 1).toString())}
                    disabled={parseInt(servingSize) >= 50}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: parseInt(servingSize) >= 50 
                        ? 'linear-gradient(135deg, #f3f4f6, #e5e7eb)' 
                        : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: parseInt(servingSize) >= 50 ? '#9ca3af' : 'white',
                      cursor: parseInt(servingSize) >= 50 ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (parseInt(servingSize) < 50) {
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (parseInt(servingSize) < 50) {
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Quick Select Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {[1, 2, 4, 6, 8, 12].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setServingSize(size.toString())}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      background: parseInt(servingSize) === size 
                        ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                        : 'white',
                      color: parseInt(servingSize) === size ? 'white' : '#64748b',
                      border: parseInt(servingSize) === size 
                        ? '2px solid #667eea' 
                        : '2px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (parseInt(servingSize) !== size) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (parseInt(servingSize) !== size) {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    {size} {size === 1 ? 'person' : 'people'}
                  </button>
                ))}
              </div>
              
              {/* Additional Info */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea10, #764ba210)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #667eea30',
                marginTop: '16px'
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#667eea' }}>Pro tip:</strong> Consider appetites and meal context. Main dishes typically serve fewer than appetizers or sides.
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
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

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap'
          }}>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                padding: '16px 32px',
                fontSize: '1rem',
                fontWeight: '600',
                background: (loading || !isFormValid) 
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || !isFormValid) 
                  ? 'none' 
                  : '0 4px 16px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                minWidth: '160px'
              }}
              onMouseEnter={(e) => {
                if (!loading && isFormValid) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && isFormValid) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <span>{isEditing ? '💾' : '✨'}</span>
                  {isEditing ? 'Update Recipe' : 'Save Recipe'}
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '16px 32px',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = 'linear-gradient(135deg, #e5e7eb, #d1d5db)';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = 'linear-gradient(135deg, #f3f4f6, #e5e7eb)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <span>❌</span>
              Cancel
            </button>
          </div>
        </form>
      </div>
      
      {/* Add spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RecipeForm;