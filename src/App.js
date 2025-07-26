import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Auth from './components/Auth';
import RecipeManager from './components/RecipeManager';
import ProfileSetup from './components/ProfileSetup';
import FriendsRecipes from './components/FriendsRecipes';
import './App.css';
import ProfileSettings from './components/ProfileSettings';
import ShoppingLists from './components/ShoppingLists';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [viewFriendsRecipes, setViewFriendsRecipes] = useState(false);
  const [viewProfile, setViewProfile] = useState(false)
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showShoppingLists, setShowShoppingLists] = useState(false);

  // Check if user has a profile
  const checkUserProfile = async (uid) => {
    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        // Add default isPublic field if it doesn't exist (for existing users)
        if (profileData.isPublic === undefined) {
          profileData.isPublic = false; // Default to private
        }
        setUserProfile(profileData);
        setNeedsProfileSetup(false);
      } else {
        setUserProfile(null);
        setNeedsProfileSetup(true);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      setNeedsProfileSetup(true); // Default to needing setup if there's an error
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user has a profile
        await checkUserProfile(currentUser.uid);
      } else {
        setUserProfile(null);
        setNeedsProfileSetup(false);
        setPendingRequestsCount(0);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for pending follow requests
  useEffect(() => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }

    const pendingQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    }, (error) => {
      console.error('Error listening to pending requests:', error);
      setPendingRequestsCount(0);
    });

    return () => unsubscribe();
  }, [user]);

  const handleProfileCreated = (profileData) => {
    setUserProfile(profileData);
    setNeedsProfileSetup(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBackToRecipes = () => {
    setViewFriendsRecipes(false);
    setViewProfile(false);
  };

  const handleProfileUpdated = (updatedProfile) => {
    setUserProfile(updatedProfile);
    console.log('Profile updated:', updatedProfile);
  };
  
  const handleAccountDeleted = () => {
    // Clear all state
    setUser(null);
    setUserProfile(null);
    setNeedsProfileSetup(false);
    setViewFriendsRecipes(false);
    console.log('Account deleted - user signed out');
    // The user will automatically be redirected to Auth component since user is null
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: 'white', fontSize: '18px', fontWeight: '500' }}>
            Loading your recipes...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (needsProfileSetup) {
    return <ProfileSetup user={user} onProfileCreated={handleProfileCreated} />;
  }

  if (viewProfile) {
    return (
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <ProfileSettings
          user={user}
          userProfile={userProfile}
          onBack={handleBackToRecipes}
          onProfileUpdated={handleProfileUpdated}
          onAccountDeleted={handleAccountDeleted}
        />
      </div>
    );
  }

  // Show Friends Recipes page
  if (viewFriendsRecipes) {
    return (
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <FriendsRecipes 
          user={user}
          userProfile={userProfile}
          onBack={handleBackToRecipes}
        />
      </div>
    );
  }

  if (showShoppingLists) {
    return (
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <ShoppingLists user={user} onBack={() => setShowShoppingLists(false)} />
      </div>
    );
  }

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Enhanced App Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0',
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
        
        <div 
          className="header-container"
          style={{ 
            position: 'relative',
            zIndex: 10,
            padding: '25px 30px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            maxWidth: '1200px', 
            margin: '0 auto',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
          {/* App Logo/Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              🍳
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                color: 'white',
                fontSize: '2.2rem',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                MyRecipeJar
              </h1>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                fontWeight: '400'
              }}>
                Your personal recipe collection
              </p>
            </div>
          </div>
          
          {/* Navigation Buttons Container */}
          <div 
            className="nav-buttons"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '8px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
            {/* Profile Button (Welcome Back) */}
            <button
              onClick={() => setViewProfile(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.8rem',
                fontWeight: '400'
              }}>
                Welcome back
              </div>
              <div style={{
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                {userProfile?.displayName || user.email.split('@')[0]}
              </div>
            </button>

            {/* Friends Button */}
            <button
              onClick={() => setViewFriendsRecipes(true)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span>👥</span>
              Friends
              {/* Notification Badge */}
              {pendingRequestsCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '18px',
                  height: '18px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'white',
                  border: '2px solid white'
                }}>
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </div>
              )}
            </button>
            {/* Shopping Lists Button */}
            <button
              onClick={() => setShowShoppingLists(true)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span>🛒</span>
              Shopping Lists
            </button>
            
            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 68, 68, 0.3)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <span>🚪</span>
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content with enhanced styling */}
      <main style={{ 
        padding: '40px 30px', 
        maxWidth: '1200px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <RecipeManager user={user} userProfile={userProfile} />
      </main>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive navigation */
        @media (max-width: 768px) {
          .header-container {
            flex-direction: column !important;
            align-items: center !important;
            gap: 24px !important;
            text-align: center;
          }
          
          .nav-buttons {
            width: 100% !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
          }
          
          .nav-buttons button {
            flex: 1;
            min-width: 120px;
            max-width: 180px;
          }
        }
        
        @media (max-width: 580px) {
          .nav-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          
          .nav-buttons button {
            width: 100% !important;
            max-width: none !important;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}

export default App;