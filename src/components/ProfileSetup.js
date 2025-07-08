import React, { useState } from 'react';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Sample recipes to add for new users
const sampleRecipes = [
  {
    title: "Quick Pasta Marinara",
    category: "dinner", 
    visibility: "private",
    ingredients: [
      "1 lb spaghetti or your favorite pasta",
      "2 cups good marinara sauce",
      "3 cloves garlic, minced",
      "3 tbsp olive oil",
      "Fresh basil leaves",
      "Parmesan cheese, grated",
      "Red pepper flakes (optional)",
      "Salt to taste"
    ],
    instructions: `1. Bring a large pot of salted water to boil
2. Cook pasta according to package directions until al dente
3. While pasta cooks, heat olive oil in a large pan
4. Add minced garlic and sauté for 30 seconds until fragrant
5. Add marinara sauce and simmer for 5 minutes
6. Add red pepper flakes if using
7. Drain pasta and add to the sauce
8. Toss everything together for 1 minute
9. Serve immediately with fresh basil and parmesan

🍝 Save some pasta water - add a splash if the sauce seems too thick!`,
      servingSize: '1'
  },
  {
    title: "Classic Chocolate Chip Cookies",
    category: "dessert",
    visibility: "private", 
    ingredients: [
      "2 1/4 cups all-purpose flour",
      "1 cup (2 sticks) butter, softened",
      "3/4 cup packed brown sugar",
      "1/2 cup granulated sugar",
      "2 large eggs",
      "2 tsp vanilla extract",
      "1 tsp baking soda",
      "1 tsp salt",
      "2 cups chocolate chips"
    ],
    instructions: `1. Preheat oven to 375°F (190°C)
2. In a large bowl, cream together softened butter and both sugars until light and fluffy (2-3 minutes)
3. Beat in eggs one at a time, then add vanilla
4. In a separate bowl, whisk together flour, baking soda, and salt
5. Gradually mix the dry ingredients into the wet ingredients
6. Stir in chocolate chips until evenly distributed
7. Drop rounded tablespoons of dough onto ungreased baking sheets
8. Bake for 9-11 minutes until golden brown around the edges
9. Let cool on baking sheet for 5 minutes before transferring to wire rack

🍪 For chewier cookies, slightly underbake them. For crispier cookies, bake a minute longer!`,
      servingSize: '1'
  },
  {
    title: "Movie Night Popcorn",
    category: "snack",
    visibility: "private",
    ingredients: [
      "1/2 cup popcorn kernels",
      "3 tbsp vegetable oil",
      "1 tsp salt",
      "3 tbsp butter, melted",
      "Optional seasonings: parmesan, nutritional yeast, or spices"
    ],
    instructions: `1. Heat oil in a large pot with a tight-fitting lid over medium-high heat
2. Add 3 kernels and wait for them to pop
3. Once they pop, add the rest of the kernels
4. Cover and shake the pot occasionally
5. When popping slows to 2-3 seconds between pops, remove from heat
6. Let sit for 1 minute (kernels may still be popping)
7. Drizzle with melted butter and sprinkle with salt
8. Add any optional seasonings and toss well

🍿 The key is not lifting the lid until the popping stops!`,
      servingSize: '1'
  }
];

// Function to add sample recipes for new users
const addSampleRecipes = async (userId) => {
  try {
    console.log('Adding sample recipes for new user...');
    
    const recipePromises = sampleRecipes.map(recipe => 
      addDoc(collection(db, 'recipes'), {
        ...recipe,
        createdBy: userId,
        createdAt: serverTimestamp()
      })
    );
    
    await Promise.all(recipePromises);
    console.log(`Successfully added ${sampleRecipes.length} sample recipes`);
    
  } catch (error) {
    console.error('Error adding sample recipes:', error);
    // Don't fail profile creation if sample recipes fail
  }
};

const ProfileSetup = ({ user, onProfileCreated }) => {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation states
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Real-time validation
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

  const handleDisplayNameChange = (e) => {
    const value = e.target.value;
    setDisplayName(value);
    if (touched) {
      setValidationError(validateDisplayName(value));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setValidationError(validateDisplayName(displayName));
  };

  const isFormValid = displayName.trim() && !validationError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark as touched and validate
    setTouched(true);
    const error = validateDisplayName(displayName);
    setValidationError(error);
    
    if (error) {
      setError('Please fix the errors above before continuing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create user profile document
      const profileData = {
        uid: user.uid,
        displayName: displayName.trim(),
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore using the user's UID as document ID
      await setDoc(doc(db, 'userProfiles', user.uid), profileData);
      
      // Add sample recipes for new user
      await addSampleRecipes(user.uid);
      
      console.log('Profile created successfully with sample recipes!');
      
      // Notify parent component that profile was created
      if (onProfileCreated) {
        onProfileCreated(profileData);
      }
      
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '480px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          borderRadius: '50%',
          opacity: '0.1'
        }} />
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 2 }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 20px',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
          }}>
            👋
          </div>
          <h1 style={{
            color: '#1a202c',
            margin: '0 0 8px 0',
            fontSize: '2rem',
            fontWeight: '700'
          }}>
            Welcome to CookBook!
          </h1>
          <p style={{
            color: '#64748b',
            margin: '0 0 8px 0',
            fontSize: '1rem',
            lineHeight: '1.5'
          }}>
            Let's set up your profile so friends can find you and you can start collaborating on recipes.
          </p>
          <p style={{
            color: '#94a3b8',
            margin: 0,
            fontSize: '0.9rem'
          }}>
            Signed in as: <strong>{user?.email}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Choose your display name *
            </label>
            <input
              type="text"
              placeholder="e.g., John Smith, Chef Mike, Sarah K..."
              value={displayName}
              onChange={handleDisplayNameChange}
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '1.1rem',
                border: touched && validationError 
                  ? '2px solid #ef4444' 
                  : touched && !validationError && displayName.trim()
                    ? '2px solid #10b981'
                    : '2px solid #e2e8f0',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: touched && validationError 
                  ? '#fef2f2' 
                  : touched && !validationError && displayName.trim()
                    ? '#f0fdf4'
                    : '#ffffff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                if (!touched || !validationError) {
                  e.target.style.borderColor = '#667eea';
                }
              }}
              onBlur={(e) => {
                handleBlur();
                if (!validationError) {
                  e.target.style.borderColor = displayName.trim() ? '#10b981' : '#e2e8f0';
                }
              }}
            />
            
            {/* Validation feedback */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {touched && validationError && (
                <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {validationError}
                </span>
              )}
              {touched && !validationError && displayName.trim() && (
                <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✅</span> Perfect!
                </span>
              )}
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: 'auto' }}>
                {displayName.length}/50
              </span>
            </div>

            {/* Helper text */}
            <p style={{
              color: '#64748b',
              fontSize: '0.85rem',
              margin: '8px 0 0 0',
              lineHeight: '1.4'
            }}>
              This is how your name will appear to friends and in collaborations. You can change it later in your profile settings.
            </p>
          </div>

          {/* Error message */}
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '1.1rem',
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
              gap: '12px'
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
                Setting up your account...
              </>
            ) : (
              <>
                <span>✨</span>
                Complete Setup
              </>
            )}
          </button>
        </form>

        {/* Footer note with sample recipes info */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{
            color: '#64748b',
            fontSize: '0.85rem',
            margin: '0 0 8px 0',
            lineHeight: '1.4'
          }}>
            🍳 We'll add some sample recipes to get you started! You can edit or delete them anytime.
          </p>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.8rem',
            margin: 0,
            lineHeight: '1.4'
          }}>
            🔒 Your profile information is private by default. You control what you share and with whom.
          </p>
        </div>
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

export default ProfileSetup;