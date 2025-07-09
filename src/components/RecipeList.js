import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import RecipeCard from './RecipeCard';

const RecipeList = ({ user, onSelectRecipe }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search states
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: 'all',
    ingredientCount: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Create a query to get recipes for the current user
    const recipesQuery = query(
      collection(db, 'recipes'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      recipesQuery,
      (querySnapshot) => {
        const recipesData = [];
        querySnapshot.forEach((doc) => {
          recipesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setRecipes(recipesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching recipes:', error);
        setError('Failed to load recipes');
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  // Handle click outside search to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search logic
  const allSearchResults = recipes.filter(recipe => 
    searchText.trim() && 
    recipe.title.toLowerCase().includes(searchText.toLowerCase().trim())
  );

  const displayedSearchResults = allSearchResults
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 5);

  const hasMoreResults = allSearchResults.length > 5;
  const resultCountText = allSearchResults.length === 0 
    ? "No recipes found"
    : hasMoreResults 
      ? `5 of ${allSearchResults.length} recipes found`
      : `${allSearchResults.length} recipe${allSearchResults.length !== 1 ? 's' : ''} found`;

  const shouldShowSearchResults = searchText.trim().length > 0;

  // Filter recipes based on current filters (unchanged logic)
  const filteredRecipes = recipes.filter(recipe => {
    // Category filter
    if (filters.category !== 'all' && recipe.category !== filters.category) {
      return false;
    }
    
    // Ingredient count filter
    if (filters.ingredientCount !== 'all') {
      const ingredientCount = recipe.ingredients?.length || 0;
      switch (filters.ingredientCount) {
        case 'few': // 1-6 ingredients
          if (ingredientCount < 1 || ingredientCount > 6) return false;
          break;
        case 'medium': // 7-10 ingredients
          if (ingredientCount < 7 || ingredientCount > 10) return false;
          break;
        case 'many': // 11+ ingredients
          if (ingredientCount < 11) return false;
          break;
        default:
          break;
      }
    }
    
    return true;
  });

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSearchResults(value.trim().length > 0);
  };

  // Handle search result click
  const handleSearchResultClick = (recipe) => {
    setSearchText(''); // Clear search bar
    setShowSearchResults(false); // Hide results
    onSelectRecipe(recipe); // Open recipe detail
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchText.trim().length > 0) {
      setShowSearchResults(true);
    }
  };

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      category: 'all',
      ingredientCount: 'all'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.category !== 'all' || 
                          filters.ingredientCount !== 'all'

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          textAlign: 'center'
        }}>
          <p style={{
            color: '#64748b',
            fontSize: '1.1rem',
            fontWeight: '500',
            margin: '0 0 8px 0'
          }}>
            Loading your recipes...
          </p>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.9rem',
            margin: 0
          }}>
            This might take a moment
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '20px'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          ⚠️
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#ef4444',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            Oops! Something went wrong
          </p>
          <p style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: 0
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        gap: '30px'
      }}>
        {/* Illustration */}
        <div style={{
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #667eea20, #764ba220)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea30, #764ba230)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            📝
          </div>
        </div>
        
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: '0 0 12px 0'
          }}>
            No recipes yet!
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            lineHeight: '1.6',
            margin: 0
          }}>
            Start building your personal recipe collection! Click "Add New Recipe" to create your first delicious recipe.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div style={{
          display: 'flex',
          gap: '20px',
          opacity: 0.6
        }}>
          <div style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: '#667eea',
            fontWeight: '500'
          }}>
            🍳 Organize recipes
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: '#667eea',
            fontWeight: '500'
          }}>
            📱 Access anywhere
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: '#667eea',
            fontWeight: '500'
          }}>
            ⭐ Never lose a recipe
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(250px, 300px) 1fr',
        gap: '20px',
        marginBottom: '24px',
        '@media (max-width: 768px)': {
          gridTemplateColumns: '1fr',
          gap: '16px'
        }
      }} className="search-filter-container">
        
        {/* Search Section */}
        <div style={{ position: 'relative' }} ref={searchRef}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '18px', color: '#64748b' }}>🔍</span>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchText}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#374151',
                  background: 'transparent'
                }}
              />
              {searchText && (
                <button
                  onClick={() => {
                    setSearchText('');
                    setShowSearchResults(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '18px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {shouldShowSearchResults && showSearchResults && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              marginTop: '4px',
              overflow: 'hidden'
            }}>
              {displayedSearchResults.length > 0 ? (
                <>
                  {displayedSearchResults.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSearchResultClick(recipe)}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        border: 'none',
                        background: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        color: '#374151',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'white';
                      }}
                    >
                      <div style={{
                        fontWeight: '500',
                        marginBottom: '2px'
                      }}>
                        {recipe.title}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#64748b'
                      }}>
                        {getCategoryEmoji(recipe.category)} {getCategoryLabel(recipe.category)}
                      </div>
                    </button>
                  ))}
                  <div style={{
                    padding: '8px 20px',
                    background: '#f8fafc',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    {resultCountText}
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                  No recipes found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Filter Header */}
          <div
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '16px 20px',
              background: showFilters ? 'linear-gradient(135deg, #f8fafc, #e2e8f0)' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: showFilters ? '1px solid #e2e8f0' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <span style={{ 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Filters
              </span>
              {hasActiveFilters && (
                <span style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  Active
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasActiveFilters && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear all
                </button>
              )}
              <span style={{
                fontSize: '14px',
                color: '#64748b',
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}>
                ▼
              </span>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {/* Meal Category Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  🏷️ Meal Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="all">All Categories</option>
                  <option value="breakfast">🌅 Breakfast</option>
                  <option value="lunch">🥙 Lunch</option>
                  <option value="dinner">🍽️ Dinner</option>
                  <option value="snack">🍿 Snack</option>
                  <option value="dessert">🍰 Dessert</option>
                  <option value="cocktail">🍸 Cocktail</option>
                </select>
              </div>

              {/* Ingredient Count Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  🥘 Ingredient Count
                </label>
                <select
                  value={filters.ingredientCount}
                  onChange={(e) => setFilters(prev => ({ ...prev, ingredientCount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="all">Any Amount</option>
                  <option value="few">Few (1-6 ingredients)</option>
                  <option value="medium">Medium (7-10 ingredients)</option>
                  <option value="many">Many (11+ ingredients)</option>
                </select>
              </div>

              {/* Instructions Filter */}

            </div>
          )}
        </div>
      </div>

      {/* Recipe count header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.3rem',
            fontWeight: '600',
            margin: '0 0 4px 0'
          }}>
            {filteredRecipes.length === 1 ? '1 Recipe' : `${filteredRecipes.length} Recipes`}
            {hasActiveFilters && (
              <span style={{ 
                color: '#64748b', 
                fontWeight: '400',
                fontSize: '1rem'
              }}>
                {` of ${recipes.length} total`}
              </span>
            )}
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: 0
          }}>
            {hasActiveFilters 
              ? 'Filtered results' 
              : filteredRecipes.length === 1 
                ? 'Your culinary journey begins' 
                : 'Your personal recipe collection'
            }
          </p>
        </div>
        
        {/* Sort indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '14px' }}>📅</span>
          <span style={{
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}>
            Newest first
          </span>
        </div>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          padding: '0'
        }}>
          {filteredRecipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id}
              recipe={recipe}
              onSelect={onSelectRecipe}
            />
          ))}
        </div>
      ) : (
        // No results message
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '20px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea20, #764ba220)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            🔍
          </div>
          
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h3 style={{
              color: '#1a202c',
              fontSize: '1.3rem',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              No recipes match your filters
            </h3>
            <p style={{
              color: '#64748b',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              margin: '0 0 20px 0'
            }}>
              Try adjusting your filter criteria or clear all filters to see more recipes.
            </p>
            
            <button
              onClick={resetFilters}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
      
      {/* Bottom spacing */}
      <div style={{ height: '40px' }} />
      
      {/* Add global styles for animations and responsive design */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .search-filter-container {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .recipe-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
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
    dessert: 'Dessert',
    cocktail: 'Cocktail'
  };
  return labelMap[category] || 'Dinner';
}

export default RecipeList;