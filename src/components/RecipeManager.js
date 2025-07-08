import React, { useState } from 'react';
import RecipeList from './RecipeList';
import RecipeForm from './RecipeForm';
import RecipeDetail from './RecipeDetail';

const RecipeManager = ({ user }) => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Handle going back to the main recipe list
  const handleBackToList = () => {
    setSelectedRecipe(null);
    setShowAddRecipe(false);
    setEditingRecipe(null);
  };

  // Handle saving a recipe (both new and edited)
  const handleSaveRecipe = () => {
    setShowAddRecipe(false);
    setEditingRecipe(null);
    setSelectedRecipe(null); // Go back to list after saving
  };

  // Handle canceling add/edit
  const handleCancel = () => {
    setShowAddRecipe(false);
    setEditingRecipe(null);
  };

  // Show AddRecipe or EditRecipe form
  if (showAddRecipe || editingRecipe) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <RecipeForm 
          user={user} 
          recipe={editingRecipe} // null for new recipe, recipe object for editing
          onCancel={handleCancel}
          onSave={handleSaveRecipe}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // Show individual recipe details
  if (selectedRecipe) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <RecipeDetail 
          recipe={selectedRecipe}
          onBack={handleBackToList}
          onEdit={setEditingRecipe}
          user={user}
          readOnly={false}
        />
      </div>
    );
  }

  // Show main recipe list (default view)
  return (
    <div>
      {/* Enhanced Header with stats and search */}
      <div style={{ 
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #667eea20, #764ba220)',
          borderRadius: '50%',
          opacity: 0.6
        }} />
        
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              color: '#1a202c',
              fontSize: '2rem',
              fontWeight: '700'
            }}>
              Your Recipe Collection
            </h2>
            <p style={{
              margin: 0,
              color: '#64748b',
              fontSize: '1rem',
              fontWeight: '400'
            }}>
              Discover, create, and organize your favorite recipes
            </p>
          </div>
          
          <button
            onClick={() => setShowAddRecipe(true)}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            Add New Recipe
          </button>
        </div>
      </div>

      {/* Recipe List Container */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        minHeight: '400px'
      }}>
        <RecipeList 
          user={user} 
          onSelectRecipe={setSelectedRecipe}
        />
      </div>
    </div>
  );
};

export default RecipeManager;