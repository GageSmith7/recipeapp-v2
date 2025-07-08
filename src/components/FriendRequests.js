import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const FriendRequests = ({ user, userProfile, onBack }) => {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Listen to incoming friend requests
    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setIncomingRequests(requests);
    });

    // Listen to outgoing friend requests
    const outgoingQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setOutgoingRequests(requests);
    });

    // Listen to accepted friends (friends collection)
    const friendsQuery = query(
      collection(db, 'friends'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Get the other user's info
        const otherUserId = data.users.find(id => id !== user.uid);
        const otherUserInfo = data.userInfo.find(info => info.uid !== user.uid);
        if (otherUserInfo) {
          friendsList.push({
            id: doc.id,
            ...otherUserInfo,
            friendshipId: doc.id
          });
        }
      });
      setFriends(friendsList);
      setLoading(false);
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeFriends();
    };
  }, [user]);

  const handleAcceptRequest = async (request) => {
    setProcessingRequest(request.id);
    
    try {
      // Update friend request status
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Create friendship document
      await addDoc(collection(db, 'friends'), {
        users: [request.fromUserId, request.toUserId],
        userInfo: [
          {
            uid: request.fromUserId,
            email: request.fromUserEmail,
            displayName: request.fromUserDisplayName
          },
          {
            uid: request.toUserId,
            email: request.toUserEmail,
            displayName: request.toUserDisplayName
          }
        ],
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    }

    setProcessingRequest(null);
  };

  const handleDeclineRequest = async (request) => {
    setProcessingRequest(request.id);
    
    try {
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'declined',
        declinedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error declining friend request:', error);
      alert('Failed to decline friend request. Please try again.');
    }

    setProcessingRequest(null);
  };

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
        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500' }}>
          Loading your connections...
        </p>
      </div>
    );
  }

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
            My Friends
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '400'
          }}>
            Manage your connections and friend requests
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Incoming Friend Requests */}
        {incomingRequests.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📨
              </div>
              <h2 style={{
                color: '#1a202c',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                Incoming Requests ({incomingRequests.length})
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {request.fromUserDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{
                        color: '#1a202c',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        margin: '0 0 4px 0'
                      }}>
                        {request.fromUserDisplayName}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '0.9rem',
                        margin: 0
                      }}>
                        {request.fromUserEmail}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => handleAcceptRequest(request)}
                      disabled={processingRequest === request.id}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: processingRequest === request.id ? 'not-allowed' : 'pointer',
                        opacity: processingRequest === request.id ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {processingRequest === request.id ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request)}
                      disabled={processingRequest === request.id}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        cursor: processingRequest === request.id ? 'not-allowed' : 'pointer',
                        opacity: processingRequest === request.id ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {processingRequest === request.id ? 'Declining...' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👥
              </div>
              <h2 style={{
                color: '#1a202c',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                My Friends ({friends.length})
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {friend.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{
                        color: '#1a202c',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        margin: '0 0 4px 0'
                      }}>
                        {friend.displayName}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '0.9rem',
                        margin: '0 0 8px 0'
                      }}>
                        {friend.email}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#10b981',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        <span>✓</span>
                        <span>Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Requests */}
        {outgoingRequests.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📤
              </div>
              <h2 style={{
                color: '#1a202c',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                Pending Requests ({outgoingRequests.length})
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {outgoingRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {request.toUserDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{
                        color: '#1a202c',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        margin: '0 0 4px 0'
                      }}>
                        {request.toUserDisplayName}
                      </h3>
                      <p style={{
                        color: '#64748b',
                        fontSize: '0.9rem',
                        margin: '0 0 8px 0'
                      }}>
                        {request.toUserEmail}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#f59e0b',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        <span>⏳</span>
                        <span>Waiting for response</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {incomingRequests.length === 0 && outgoingRequests.length === 0 && friends.length === 0 && (
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
              👥
            </div>
            
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <h3 style={{
                color: '#1a202c',
                fontSize: '1.3rem',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                No connections yet
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                margin: 0
              }}>
                Start by finding friends to connect with and share your favorite recipes!
              </p>
            </div>
          </div>
        )}
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

export default FriendRequests;