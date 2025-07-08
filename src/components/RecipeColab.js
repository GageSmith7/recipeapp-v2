import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import FindFriends from './FindFriends';
import FriendsRecipes from './FriendsRecipes';
import FriendRequests from './FriendRequests';

export default function RecipeColab({ user, userProfile, onBack }) {
  const [activeSection, setActiveSection] = useState('main');
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);
  const [viewColab, setViewColab] = useState(false);



  // Listen for incoming friend requests
  useEffect(() => {
    if (!user) return;

    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(incomingQuery, (snapshot) => {
      setIncomingRequestsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  // Debug logging
  console.log('RecipeColab props:', { user: !!user, userProfile: !!userProfile });

  if (activeSection === 'findFriends') {
    return (
      <FindFriends 
        user={user}
        userProfile={userProfile}
        onBack={() => setActiveSection('main')}
      />
    );
  }

  if (activeSection === 'friendRequests') {
    return (
      <FriendRequests 
        user={user}
        userProfile={userProfile}
        onBack={() => setActiveSection('main')}
      />
    );
  }

  const handleBack = () => {setViewColab(false)};

  if (viewColab) {
    return (
        <FriendsRecipes
            user={user}
            onBack={handleBack}
        />
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      padding: '40px 30px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
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
              Friends
            </h2>
            <p style={{
              margin: 0,
              color: '#64748b',
              fontSize: '1rem',
              fontWeight: '400'
            }}>
              Connect with friends and share your favorite recipes
            </p>
          </div>
          
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #e5e7eb, #d1d5db)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #f3f4f6, #e5e7eb)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span>←</span> Back to Recipes
          </button>
        </div>
      </div>

      {/* Collaboration Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Find Friends Card */}
        <div
          onClick={() => setActiveSection('findFriends')}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '30px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
        >
          {/* Icon */}
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '20px'
          }}>
            🔍
          </div>
          
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: '0 0 8px 0'
          }}>
            Find Friends
          </h3>
          
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            margin: '0 0 20px 0'
          }}>
            Search for friends by email and send them friend requests to start sharing recipes.
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#667eea',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            <span>Get started</span>
            <span>→</span>
          </div>
        </div>

        {/* Friends List Card */}
        <div
          onClick={() => setActiveSection('friendRequests')}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '30px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
        >
          {/* Notification Badge */}
          {incomingRequestsCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '24px',
              height: '24px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              animation: 'pulse 2s infinite'
            }}>
              {incomingRequestsCount > 9 ? '9+' : incomingRequestsCount}
            </div>
          )}
          
          {/* Icon */}
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '20px'
          }}>
            👥
          </div>
          
          <h3 style={{
            color: '#1a202c',
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: '0 0 8px 0'
          }}>
            My Friends
            {incomingRequestsCount > 0 && (
              <span style={{
                marginLeft: '8px',
                color: '#ef4444',
                fontSize: '1rem'
              }}>
                ({incomingRequestsCount} new)
              </span>
            )}
          </h3>
          
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            margin: '0 0 20px 0'
          }}>
            {incomingRequestsCount > 0 
              ? `You have ${incomingRequestsCount} pending friend ${incomingRequestsCount === 1 ? 'request' : 'requests'}!`
              : 'View your friends list, manage friend requests, and see their public recipes.'
            }
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: incomingRequestsCount > 0 ? '#ef4444' : '#10b981',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            <span>{incomingRequestsCount > 0 ? 'View requests' : 'Manage connections'}</span>
            <span>→</span>
          </div>
        </div>

        {/* Recipe Collaborations Card (Coming Soon) */}
        <div onClick={() => setViewColab(true)} style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '30px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}>
        
          {/* Icon */}
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #9ca3af, #6b7280)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '20px'
          }}>
            🤝
          </div>
          
          <h3 style={{
            color: 'black',
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: '0 0 8px 0'
          }}>
            Recipe Collaborations
          </h3>
          
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            margin: '0 0 20px 0'
          }}>
            Create shared recipe collections with friends and family for special occasions.
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#667eea',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            <span>View Collaborations</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        marginTop: '30px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          color: '#374151',
          fontSize: '1.2rem',
          fontWeight: '600',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>💡</span>
          How Collaborations Work
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <h4 style={{
              color: '#1a202c',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              1. Find Friends
            </h4>
            <p style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Search for friends by their email address and send friend requests.
            </p>
          </div>
          <div>
            <h4 style={{
              color: '#1a202c',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              2. Share Recipes
            </h4>
            <p style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Mark your recipes as "Public" to share them with your friends.
            </p>
          </div>
          <div>
            <h4 style={{
              color: '#1a202c',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              3. Collaborate
            </h4>
            <p style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Create shared collections and build recipe libraries together.
            </p>
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}