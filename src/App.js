import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Auth from './components/Auth';
import RecipeManager from './components/RecipeManager';
import ProfileSetup from './components/ProfileSetup';
import RecipeColab from './components/RecipeColab';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [colab, setColab] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a profile
  const checkUserProfile = async (uid) => {
    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', uid));
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data());
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
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  const handleBackToList = () => {setColab(false)};

  if (colab) {
    return (
      <RecipeColab 
      onBack={handleBackToList}
      user={user}
      userProfile={userProfile}/>
    );
  }

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
        
        <div style={{ 
          position: 'relative',
          zIndex: 10,
          padding: '25px 30px',
          maxWidth: '1200px', 
          margin: '0 auto'
        }} className="header-content">
          {/* Top row with logo and welcome message */}
          <div style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0'
          }} className="header-top-row">
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
                }} className="app-title">
                  MyRecipeJar
                </h1>
                <p style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem',
                  fontWeight: '400'
                }} className="app-subtitle">
                  Your personal recipe collection
                </p>
              </div>
            </div>
            
            {/* Welcome message - hidden on mobile */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px 16px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }} className="welcome-message">
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.85rem',
                marginBottom: '2px',
              }}>
                Welcome back
              </div>
              <div style={{
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '600'
              }}>
                {userProfile?.displayName || user.email.split('@')[0]}
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            justifyContent: 'flex-start'
          }} className="header-buttons">
            <button
              onClick={() => setColab(true)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                minWidth: '80px',
              }}
              className="header-button"
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Friends
            </button>
            
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                minWidth: '80px',
              }}
              className="header-button"
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
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
      
      {/* Add some global styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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