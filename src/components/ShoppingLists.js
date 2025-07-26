import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import RecipeSelector from './RecipeSelector';
import ShoppingListDetail from './ShoppingListDetail';
import { aggregateIngredients } from '../utils/ingredientParser';

const ShoppingLists = ({ user, onBack }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [viewingList, setViewingList] = useState(null);

  // Fetch shopping lists from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchShoppingLists = async () => {
      try {
        setLoading(true);
        const listsQuery = query(
          collection(db, 'shoppingLists'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(listsQuery, (snapshot) => {
          const listsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
          }));
          setLists(listsData);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching shopping lists:', error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up shopping lists listener:', error);
        setLoading(false);
      }
    };

    fetchShoppingLists();
  }, [user]);

  const handleCreateNewList = () => {
    setShowCreateForm(true);
  };

  const handleCreateFormSubmit = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      // Generate shopping list items from selected recipes
      const shoppingListItems = aggregateIngredients(selectedRecipes);
      
      const newListData = {
        userId: user.uid,
        name: newListName.trim(),
        items: shoppingListItems.map(item => ({
          id: `${Date.now()}-${Math.random()}`, // Simple unique ID
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: false,
          sourceRecipeIds: item.sourceRecipeIds || [item.sourceRecipeId],
          sourceRecipeNames: item.sourceRecipeNames || [item.sourceRecipeName]
        })),
        recipes: selectedRecipes.map(recipe => ({
          recipeId: recipe.id,
          recipeName: recipe.title
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'shoppingLists'), newListData);
      console.log('Shopping list created with ID:', docRef.id);
      console.log('Generated items:', shoppingListItems);
      
      setNewListName('');
      setSelectedRecipes([]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating shopping list:', error);
      alert('Failed to create shopping list. Please try again.');
    }
  };

  const handleDeleteList = async (id) => {
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
      console.log('Shopping list deleted successfully');
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      alert('Failed to delete shopping list. Please try again.');
    }
  };

  const handleViewList = (list) => {
    setViewingList(list);
  };

  const handleBackToOverview = () => {
    setViewingList(null);
  };

  const handleRecipesSelected = (recipes) => {
    setSelectedRecipes(recipes);
  };

  // Placeholder for Shopping List Detail View
  if (viewingList) {
    return (
      <ShoppingListDetail
        list={viewingList}
        onBack={handleBackToOverview}
        onUpdate={(updatedItems) => {
          // Update the local state to reflect changes
          setLists(prevLists => 
            prevLists.map(list => 
              list.id === viewingList.id 
                ? { ...list, items: updatedItems }
                : list
            )
          );
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '25px 30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <div style={{ 
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px 20px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(5px)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.25)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ 
              margin: 0, 
              color: 'white',
              fontSize: '2.2rem',
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Shopping Lists
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1rem',
              fontWeight: '400'
            }}>
              Organize your grocery shopping
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: '40px 30px', 
        maxWidth: '1200px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Create New List Button */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={handleCreateNewList}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '16px 24px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            <span style={{ fontSize: '20px' }}>➕</span>
            New Shopping List
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            maxWidth: '600px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
              Create New Shopping List
            </h3>
            <form onSubmit={handleCreateFormSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g., Weekly Groceries"
                  required
                />
              </div>

              {/* Recipe Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Select Recipes
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecipeSelector(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    background: 'white',
                    color: '#666',
                    fontSize: '16px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {selectedRecipes.length > 0 
                    ? `${selectedRecipes.length} recipe${selectedRecipes.length !== 1 ? 's' : ''} selected`
                    : 'Click to select recipes'
                  }
                </button>
              </div>

              {/* Selected Recipes Preview */}
              {selectedRecipes.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#555',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Selected Recipes:
                  </label>
                  <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                    {selectedRecipes.map((recipe, index) => (
                      <div
                        key={recipe.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <span>{recipe.title}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecipes(prev => prev.filter((_, i) => i !== index))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={selectedRecipes.length === 0}
                  style={{
                    background: selectedRecipes.length > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    border: 'none',
                    cursor: selectedRecipes.length > 0 ? 'pointer' : 'not-allowed',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRecipes.length > 0) {
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Create List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedRecipes([]);
                    setNewListName('');
                  }}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recipe Selector Modal */}
        {showRecipeSelector && (
          <RecipeSelector
            user={user}
            onRecipesSelected={handleRecipesSelected}
            onClose={() => setShowRecipeSelector(false)}
          />
        )}

        {/* Lists */}
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px 20px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          <div>
            {lists.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No shopping lists yet</h3>
                <p style={{ margin: 0, color: '#666' }}>Create your first shopping list to get started</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {lists.map(list => (
                  <div
                    key={list.id}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-4px)';
                      e.target.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: '600' }}>
                        {list.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: '16px',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {list.items?.length || 0} items
                      </span>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        Created {list.createdAt instanceof Date ? list.createdAt.toLocaleDateString() : new Date(list.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleViewList(list)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      View List
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ShoppingLists; 