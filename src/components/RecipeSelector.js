import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const RecipeSelector = ({ user, onRecipesSelected, onClose }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [filter, setFilter] = useState('both'); // 'own', 'friends', 'both'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchRecipes = async () => {
      try {
        setLoading(true);
        let allRecipes = [];

        console.log('Fetching recipes for user:', user.uid);
        console.log('Current filter:', filter);

        // Fetch user's own recipes
        if (filter === 'own' || filter === 'both') {
          console.log('Fetching own recipes...');
          const ownRecipesQuery = query(
            collection(db, 'recipes'),
            where('createdBy', '==', user.uid)
          );
          
          const ownRecipesSnapshot = await getDocs(ownRecipesQuery);
          console.log('Own recipes found:', ownRecipesSnapshot.docs.length);
          
          // Debug: Log the first few recipe documents to see their structure
          if (ownRecipesSnapshot.docs.length > 0) {
            console.log('First recipe document:', ownRecipesSnapshot.docs[0].data());
            console.log('All recipe documents:');
            ownRecipesSnapshot.docs.forEach((doc, index) => {
              console.log(`Recipe ${index + 1}:`, doc.data());
            });
          } else {
            // Let's also try to get ALL recipes to see if any exist
            console.log('No recipes found with createdBy filter, checking all recipes...');
            const allRecipesQuery = query(collection(db, 'recipes'));
            const allRecipesSnapshot = await getDocs(allRecipesQuery);
            console.log('Total recipes in database:', allRecipesSnapshot.docs.length);
            if (allRecipesSnapshot.docs.length > 0) {
              console.log('Sample recipe structure:', allRecipesSnapshot.docs[0].data());
            }
          }
          
          const ownRecipes = ownRecipesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            source: 'own'
          }));
          console.log('Own recipes data:', ownRecipes);
          allRecipes = [...allRecipes, ...ownRecipes];
        }

        // Fetch friends' recipes
        if (filter === 'friends' || filter === 'both') {
          console.log('Fetching friends recipes...');
          // First, get the user's friends (people they follow)
          const followingQuery = query(
            collection(db, 'follows'),
            where('followerId', '==', user.uid),
            where('status', '==', 'active')
          );
          
          const followingSnapshot = await getDocs(followingQuery);
          const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);
          console.log('Following IDs:', followingIds);

          if (followingIds.length > 0) {
            // Get recipes from friends
            const friendsRecipesQuery = query(
              collection(db, 'recipes'),
              where('createdBy', 'in', followingIds)
            );
            
            const friendsRecipesSnapshot = await getDocs(friendsRecipesQuery);
            console.log('Friends recipes found:', friendsRecipesSnapshot.docs.length);
            
            const friendsRecipes = friendsRecipesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              source: 'friends'
            }));
            console.log('Friends recipes data:', friendsRecipes);
            allRecipes = [...allRecipes, ...friendsRecipes];
          }
        }

        console.log('Total recipes found:', allRecipes.length);
        console.log('All recipes:', allRecipes);
        setRecipes(allRecipes);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [user, filter]);

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecipeToggle = (recipeId) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleConfirmSelection = () => {
    const selectedRecipeData = recipes.filter(recipe => selectedRecipes.includes(recipe.id));
    onRecipesSelected(selectedRecipeData);
    onClose();
  };

  const getSourceLabel = (source) => {
    return source === 'own' ? 'My Recipe' : 'Friend\'s Recipe';
  };

  const getSourceColor = (source) => {
    return source === 'own' ? '#667eea' : '#10b981';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '80vh',
        width: '90%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#333' }}>Select Recipes</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <button
              onClick={() => setFilter('both')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: filter === 'both' ? '#667eea' : 'white',
                color: filter === 'both' ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              All Recipes
            </button>
            <button
              onClick={() => setFilter('own')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: filter === 'own' ? '#667eea' : 'white',
                color: filter === 'own' ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              My Recipes
            </button>
            <button
              onClick={() => setFilter('friends')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: filter === 'friends' ? '#667eea' : 'white',
                color: filter === 'friends' ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Friends' Recipes
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Recipe List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No recipes found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    background: selectedRecipes.includes(recipe.id) ? '#f0f8ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleRecipeToggle(recipe.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipes.includes(recipe.id)}
                    onChange={() => handleRecipeToggle(recipe.id)}
                    style={{ marginRight: '12px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, color: '#333' }}>{recipe.title}</h4>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getSourceColor(recipe.source),
                        color: 'white'
                      }}>
                        {getSourceLabel(recipe.source)}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {recipe.category} • {Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0} ingredients
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              background: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={selectedRecipes.length === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: selectedRecipes.length > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
              color: 'white',
              cursor: selectedRecipes.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Add {selectedRecipes.length} Recipe{selectedRecipes.length !== 1 ? 's' : ''} to List
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RecipeSelector; 