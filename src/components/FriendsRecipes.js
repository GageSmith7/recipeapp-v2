import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import RecipeCard from './RecipeCard';
import RecipeDetail from './RecipeDetail';
import FriendManagement from './FriendManagement';

const FriendsRecipes = ({ user, userProfile, onBack }) => {
  const [friendsRecipes, setFriendsRecipes] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFriendManagement, setShowFriendManagement] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: 'all',
    friend: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadFollowingAndRecipes = async () => {
      try {
        // First, get all users I'm following
        const followingQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid),
          where('status', '==', 'active')
        );
        
        const followingSnapshot = await getDocs(followingQuery);
        const followingList = [];
        const followingUserIds = [];
        
        followingSnapshot.forEach((doc) => {
          const data = doc.data();
          const followingUserInfo = {
            uid: data.followingId,
            email: data.followingEmail,
            displayName: data.followingDisplayName
          };
          
          followingList.push(followingUserInfo);
          followingUserIds.push(data.followingId);
        });
        
        setFollowingUsers(followingList);

        if (followingUserIds.length === 0) {
          setLoading(false);
          return;
        }

        // Then, get all recipes from users I'm following
        // Note: We no longer filter by visibility since we removed that from recipes
        const recipesQuery = query(
          collection(db, 'recipes'),
          where('createdBy', 'in', followingUserIds),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(recipesQuery, (snapshot) => {
          const recipes = [];
          snapshot.forEach((doc) => {
            const recipeData = { id: doc.id, ...doc.data() };
            
            // Add creator info to recipe
            const creator = followingList.find(friend => friend.uid === recipeData.createdBy);
            if (creator) {
              recipeData.creatorInfo = creator;
            }
            
            recipes.push(recipeData);
          });
          
          setFriendsRecipes(recipes);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching friends recipes:', error);
          setError('Failed to load friends\' recipes');
          setLoading(false);
        });

        return () => unsubscribe();
        
      } catch (error) {
        console.error('Error loading following and recipes:', error);
        setError('Failed to load friends\' recipes');
        setLoading(false);
      }
    };

    loadFollowingAndRecipes();
  }, [user]);

  // Filter recipes based on current filters
  const filteredRecipes = friendsRecipes.filter(recipe => {
    // Category filter
    if (filters.category !== 'all' && recipe.category !== filters.category) {
      return false;
    }
    
    // Friend filter
    if (filters.friend !== 'all' && recipe.createdBy !== filters.friend) {
      return false;
    }
    
    return true;
  });

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      category: 'all',
      friend: 'all'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.category !== 'all' || filters.friend !== 'all';

  // Handle manage friends navigation
  const handleManageFriends = () => {
    setShowFriendManagement(true);
  };

  const handleBackFromManagement = () => {
    setShowFriendManagement(false);
  };

  // Show Friend Management page
  if (showFriendManagement) {
    return (
      <FriendManagement 
        user={user}
        userProfile={userProfile}
        onBack={handleBackFromManagement}
      />
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
          onBack={() => setSelectedRecipe(null)}
          onEdit={null} // Friends can't edit each other's recipes
          readOnly={true}
          user={user}
        />
      </div>
    );
  }

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
            Loading friends' recipes...
          </p>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Discovering delicious recipes from your network
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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

        {/* Manage Friends button */}
        <button
          onClick={handleManageFriends}
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '12px 24px',
            marginBottom: '30px',
            marginLeft: '12px',
            background: 'rgba(255, 255, 255, 0.25)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.35)';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 6px 16px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.25)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)';
          }}
        >
          <span>👥</span> Manage Friends
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
            Friends' Recipes
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '400'
          }}>
            Discover and enjoy recipes shared by people you follow
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Error State */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
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

        {/* No Following State */}
        {followingUsers.length === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            gap: '30px'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #10b98120, #05966920)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              👥
            </div>
            
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <h3 style={{
                color: '#1a202c',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 12px 0'
              }}>
                You're not following anyone yet!
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: 0
              }}>
                Start by finding people to follow. Once you follow them, their recipes will appear here for you to discover and enjoy!
              </p>
            </div>
          </div>
        )}

        {/* No Recipes State */}
        {followingUsers.length > 0 && friendsRecipes.length === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            gap: '30px'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #10b98120, #05966920)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              🍽️
            </div>
            
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <h3 style={{
                color: '#1a202c',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 12px 0'
              }}>
                No recipes yet
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: 0
              }}>
                The people you follow haven't shared any recipes yet. Encourage them to start sharing their culinary creations!
              </p>
            </div>
          </div>
        )}

        {/* Recipes Feed */}
        {friendsRecipes.length > 0 && (
          <>
            {/* Filter Section */}
            <div style={{
              marginBottom: '24px',
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
                      background: 'linear-gradient(135deg, #10b981, #059669)',
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
                        color: '#10b981',
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
                  {/* Category Filter */}
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
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="all">All Categories</option>
                      <option value="breakfast">🌅 Breakfast</option>
                      <option value="lunch">🥙 Lunch</option>
                      <option value="dinner">🍽️ Dinner</option>
                      <option value="snack">🍿 Snack</option>
                      <option value="dessert">🍰 Dessert</option>
                    </select>
                  </div>

                  {/* Creator Filter */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      👤 Created By
                    </label>
                    <select
                      value={filters.friend}
                      onChange={(e) => setFilters(prev => ({ ...prev, friend: e.target.value }))}
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
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="all">All People</option>
                      {followingUsers.map((friend) => (
                        <option key={friend.uid} value={friend.uid}>
                          {friend.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
                      {` of ${friendsRecipes.length} total`}
                    </span>
                  )}
                </h3>
                <p style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  margin: 0
                }}>
                  {hasActiveFilters 
                    ? 'Filtered results from your network' 
                    : `Shared by ${followingUsers.length} ${followingUsers.length === 1 ? 'person' : 'people'} you follow`
                  }
                </p>
              </div>
              
              {/* Sort indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <span style={{ fontSize: '14px' }}>📅</span>
                <span style={{
                  color: '#059669',
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
                  <div key={recipe.id} style={{ position: 'relative' }}>
                    {/* Creator Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      zIndex: 5,
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '12px' }}>👤</span>
                      {recipe.creatorInfo?.displayName || 'Friend'}
                    </div>
                    
                    <RecipeCard 
                      recipe={recipe}
                      onSelect={setSelectedRecipe}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // No filtered results
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
                  background: 'linear-gradient(135deg, #10b98120, #05966920)',
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
                      background: 'linear-gradient(135deg, #10b981, #059669)',
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
                      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
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
          </>
        )}
      </div>
      
      {/* Add global styles for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FriendsRecipes;