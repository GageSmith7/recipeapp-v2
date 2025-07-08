import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const FindFriends = ({ user, userProfile, onBack }) => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Don't allow searching for your own email
    if (searchEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setError("You can't send a friend request to yourself!");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setSearchResult(null);

    try {
      // Search for user profile by email
      const profilesQuery = query(
        collection(db, 'userProfiles'),
        where('email', '==', searchEmail.trim().toLowerCase())
      );
      
      const querySnapshot = await getDocs(profilesQuery);
      
      if (querySnapshot.empty) {
        setError('No user found with that email address. Make sure they have signed up for FlavorBook!');
      } else {
        const foundProfile = querySnapshot.docs[0].data();
        setSearchResult(foundProfile);
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setError('Failed to search for user. Please try again.');
    }

    setLoading(false);
  };

  const handleSendFriendRequest = async () => {
    if (!searchResult) return;

    setLoading(true);
    setError('');

    try {
      // Create friend request document
      const friendRequestData = {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        fromUserDisplayName: userProfile.displayName,
        toUserId: searchResult.uid,
        toUserEmail: searchResult.email,
        toUserDisplayName: searchResult.displayName,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'friendRequests'), friendRequestData);
      
      setSuccess(`Friend request sent to ${searchResult.displayName}!`);
      setSearchResult(null);
      setSearchEmail('');
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Failed to send friend request. Please try again.');
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
            Find Friends
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '400'
          }}>
            Search for friends by email to start sharing recipes and collaborating
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Search Form */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea20, #764ba220)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🔍
            </div>
            <h2 style={{
              color: '#1a202c',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0
            }}>
              Search by Email
            </h2>
          </div>

          <form onSubmit={handleSearch}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="Enter your friend's email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Error Message */}
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

        {/* Success Message */}
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ color: '#15803d', fontSize: '0.95rem', fontWeight: '500' }}>
              {success}
            </span>
          </div>
        )}

        {/* Search Result */}
        {searchResult && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea20, #764ba220)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👤
              </div>
              <h3 style={{
                color: '#1a202c',
                fontSize: '1.3rem',
                fontWeight: '700',
                margin: 0
              }}>
                User Found!
              </h3>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'white',
                  fontWeight: '700'
                }}>
                  {searchResult.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{
                    color: '#1a202c',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    margin: '0 0 4px 0'
                  }}>
                    {searchResult.displayName}
                  </h4>
                  <p style={{
                    color: '#64748b',
                    fontSize: '0.9rem',
                    margin: 0
                  }}>
                    {searchResult.email}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSendFriendRequest}
              disabled={loading}
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <span>👋</span>
              {loading ? 'Sending...' : 'Send Friend Request'}
            </button>
          </div>
        )}

        {/* Helper Info */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          marginTop: '30px'
        }}>
          <h3 style={{
            color: '#374151',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            💡 How it works
          </h3>
          <ul style={{
            color: '#64748b',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            margin: 0,
            paddingLeft: '20px'
          }}>
            <li>Search for friends using their email address</li>
            <li>Send them a friend request if they have a FlavorBook account</li>
            <li>Once they accept, you'll be able to see their public recipes</li>
            <li>Start collaborating and sharing your culinary creations!</li>
          </ul>
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

export default FindFriends;