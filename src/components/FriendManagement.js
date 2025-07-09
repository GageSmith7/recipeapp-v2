import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const FriendManagement = ({ user, userProfile, onBack, pendingRequestsCount }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  
  // Follow system states
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  // Search states
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Friends are mutual follows
  const friends = following.filter(followingUser => 
    followers.some(follower => follower.uid === followingUser.uid)
  );

  useEffect(() => {
    if (!user) return;

    // Listen to people who follow me
    const followersQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeFollowers = onSnapshot(followersQuery, (snapshot) => {
      const followersList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        followersList.push({
          id: doc.id,
          uid: data.followerId,
          email: data.followerEmail,
          displayName: data.followerDisplayName,
          ...data
        });
      });
      setFollowers(followersList);
    }, (error) => {
      console.error('Error fetching followers:', error);
      setLoading(false);
    });

    // Listen to people I follow
    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeFollowing = onSnapshot(followingQuery, (snapshot) => {
      const followingList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        followingList.push({
          id: doc.id,
          uid: data.followingId,
          email: data.followingEmail,
          displayName: data.followingDisplayName,
          ...data
        });
      });
      setFollowing(followingList);
    });

    // Listen to pending requests I've received
    const pendingQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const pendingList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pendingList.push({
          id: doc.id,
          uid: data.followerId,
          email: data.followerEmail,
          displayName: data.followerDisplayName,
          ...data
        });
      });
      setPendingRequests(pendingList);
    });

    // Listen to pending requests I've sent
    const sentQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      const sentList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sentList.push({
          id: doc.id,
          uid: data.followingId,
          email: data.followingEmail,
          displayName: data.followingDisplayName,
          ...data
        });
      });
      setSentRequests(sentList);
      setLoading(false);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
      unsubscribePending();
      unsubscribeSent();
    };
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchEmail.trim()) {
      setSearchError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchEmail.trim())) {
      setSearchError('Please enter a valid email address');
      return;
    }

    if (searchEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setSearchError("You can't follow yourself!");
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const profilesQuery = query(
        collection(db, 'userProfiles'),
        where('email', '==', searchEmail.trim().toLowerCase())
      );
      
      const querySnapshot = await getDocs(profilesQuery);
      
      if (querySnapshot.empty) {
        setSearchError('No user found with that email address.');
      } else {
        const foundProfile = querySnapshot.docs[0].data();
        
        // Check if already following
        const isAlreadyFollowing = following.some(f => f.uid === foundProfile.uid);
        const hasPendingRequest = sentRequests.some(r => r.uid === foundProfile.uid);
        
        setSearchResult({
          ...foundProfile,
          isAlreadyFollowing,
          hasPendingRequest
        });
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setSearchError('Failed to search for user. Please try again.');
    }

    setSearchLoading(false);
  };

  const handleFollow = async (targetUser) => {
    setActionLoading(targetUser.uid);
    
    try {
      const followData = {
        followerId: user.uid,
        followerEmail: user.email,
        followerDisplayName: userProfile.displayName,
        followingId: targetUser.uid,
        followingEmail: targetUser.email,
        followingDisplayName: targetUser.displayName,
        status: targetUser.isPublic ? 'active' : 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'follows'), followData);
      
      // Clear search if successful
      setSearchResult(null);
      setSearchEmail('');
      
    } catch (error) {
      console.error('Error following user:', error);
      setSearchError('Failed to follow user. Please try again.');
    }

    setActionLoading(null);
  };

  const handleAcceptRequest = async (request) => {
    setActionLoading(request.uid);
    
    try {
      await updateDoc(doc(db, 'follows', request.id), {
        status: 'active',
        acceptedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error accepting request:', error);
    }

    setActionLoading(null);
  };

  const handleDeclineRequest = async (request) => {
    setActionLoading(request.uid);
    
    try {
      await deleteDoc(doc(db, 'follows', request.id));
    } catch (error) {
      console.error('Error declining request:', error);
    }

    setActionLoading(null);
  };

  const handleUnfollow = async (followRecord) => {
    if (!window.confirm(`Are you sure you want to unfollow ${followRecord.displayName}?`)) {
      return;
    }

    setActionLoading(followRecord.uid);
    
    try {
      await deleteDoc(doc(db, 'follows', followRecord.id));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }

    setActionLoading(null);
  };

  const handleRemoveFollower = async (followerRecord) => {
    if (!window.confirm(`Are you sure you want to remove ${followerRecord.displayName} as a follower?`)) {
      return;
    }

    setActionLoading(followerRecord.uid);
    
    try {
      await deleteDoc(doc(db, 'follows', followerRecord.id));
    } catch (error) {
      console.error('Error removing follower:', error);
    }

    setActionLoading(null);
  };

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length, emoji: '👥' },
    { id: 'followers', label: 'Followers', count: followers.length, emoji: '👤' },
    { id: 'following', label: 'Following', count: following.length, emoji: '👋' },
    { id: 'requests', label: 'Requests', count: pendingRequestsCount || pendingRequests.length, emoji: '📨' },
    { id: 'find', label: 'Find People', count: null, emoji: '🔍' }
  ];

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
          <span>←</span> Back to Recipes
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
            Manage your connections and discover new people
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '40px' }}>
        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          marginBottom: '30px',
          background: 'white',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1',
                minWidth: '120px',
                padding: '12px 16px',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                  : 'transparent',
                color: activeTab === tab.id ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <span>{tab.emoji}</span>
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: activeTab === tab.id ? 'white' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'friends' && (
          <div>
            <h3 style={{ color: '#1a202c', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
              👥 Friends ({friends.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              People who follow you and you follow them back
            </p>
            
            {friends.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {friends.map((friend) => (
                  <div key={friend.uid} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                          {friend.displayName}
                        </h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                          {friend.email}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.8rem', fontWeight: '500' }}>
                      <span>🤝</span>
                      <span>Mutual friends</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <p>No mutual friends yet. Start following people to build your network!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div>
            <h3 style={{ color: '#1a202c', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
              👤 Followers ({followers.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              People who follow you
            </p>
            
            {followers.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {followers.map((follower) => {
                  const isMutualFriend = following.some(f => f.uid === follower.uid);
                  return (
                    <div key={follower.uid} style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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
                          {follower.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                            {follower.displayName}
                          </h4>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                            {follower.email}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: isMutualFriend ? '#10b981' : '#64748b',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          flex: 1
                        }}>
                          <span>{isMutualFriend ? '🤝' : '👤'}</span>
                          <span>{isMutualFriend ? 'Mutual friend' : 'Follows you'}</span>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveFollower(follower)}
                          disabled={actionLoading === follower.uid}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: actionLoading === follower.uid ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === follower.uid ? 0.7 : 1
                          }}
                        >
                          {actionLoading === follower.uid ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
                <p>No followers yet. Share great recipes to attract followers!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div>
            <h3 style={{ color: '#1a202c', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
              👋 Following ({following.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              People you follow
            </p>
            
            {following.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {following.map((followingUser) => {
                  const isMutualFriend = followers.some(f => f.uid === followingUser.uid);
                  return (
                    <div key={followingUser.uid} style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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
                          {followingUser.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                            {followingUser.displayName}
                          </h4>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                            {followingUser.email}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: isMutualFriend ? '#10b981' : '#f59e0b',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          flex: 1
                        }}>
                          <span>{isMutualFriend ? '🤝' : '👋'}</span>
                          <span>{isMutualFriend ? 'Mutual friend' : 'You follow'}</span>
                        </div>
                        
                        <button
                          onClick={() => handleUnfollow(followingUser)}
                          disabled={actionLoading === followingUser.uid}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #64748b, #475569)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: actionLoading === followingUser.uid ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === followingUser.uid ? 0.7 : 1
                          }}
                        >
                          {actionLoading === followingUser.uid ? 'Unfollowing...' : 'Unfollow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                <p>You're not following anyone yet. Use the search tab to find people!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            <h3 style={{ color: '#1a202c', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
              📨 Follow Requests ({pendingRequests.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              People who want to follow you
            </p>
            
            {pendingRequests.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {pendingRequests.map((request) => (
                  <div key={request.uid} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
                        {request.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                          {request.displayName}
                        </h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                          {request.email}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        disabled={actionLoading === request.uid}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: actionLoading === request.uid ? 'not-allowed' : 'pointer',
                          opacity: actionLoading === request.uid ? 0.7 : 1
                        }}
                      >
                        {actionLoading === request.uid ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request)}
                        disabled={actionLoading === request.uid}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          cursor: actionLoading === request.uid ? 'not-allowed' : 'pointer',
                          opacity: actionLoading === request.uid ? 0.7 : 1
                        }}
                      >
                        {actionLoading === request.uid ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📨</div>
                <p>No pending follow requests.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'find' && (
          <div>
            <h3 style={{ color: '#1a202c', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
              🔍 Find People
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              Search for people by email to follow them
            </p>
            
            {/* Search Form */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              marginBottom: '30px'
            }}>
              <form onSubmit={handleSearch}>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="email"
                    placeholder="Enter email address..."
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
                  disabled={searchLoading}
                  style={{
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    background: searchLoading
                      ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: searchLoading ? 'not-allowed' : 'pointer',
                    boxShadow: searchLoading
                      ? 'none'
                      : '0 4px 12px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {searchLoading && (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Error Message */}
            {searchError && (
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
                  {searchError}
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
                  gap: '16px',
                  marginBottom: '20px'
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
                  <div style={{ flex: 1 }}>
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
                      margin: '0 0 8px 0'
                    }}>
                      {searchResult.email}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: searchResult.isPublic ? '#dcfce7' : '#f1f5f9',
                        color: searchResult.isPublic ? '#059669' : '#64748b',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{searchResult.isPublic ? '🌍' : '🔒'}</span>
                        {searchResult.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>

                {searchResult.isAlreadyFollowing ? (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#059669'
                  }}>
                    <span>✅</span>
                    You're already following this person
                  </div>
                ) : searchResult.hasPendingRequest ? (
                  <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#d97706'
                  }}>
                    <span>⏳</span>
                    Follow request sent - waiting for approval
                  </div>
                ) : (
                  <button
                    onClick={() => handleFollow(searchResult)}
                    disabled={actionLoading === searchResult.uid}
                    style={{
                      padding: '14px 28px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      background: actionLoading === searchResult.uid
                        ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: actionLoading === searchResult.uid ? 'not-allowed' : 'pointer',
                      boxShadow: actionLoading === searchResult.uid
                        ? 'none'
                        : '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {actionLoading === searchResult.uid && (
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
                    {actionLoading === searchResult.uid 
                      ? 'Following...' 
                      : searchResult.isPublic 
                        ? 'Follow' 
                        : 'Send Follow Request'
                    }
                  </button>
                )}
              </div>
            )}

            {/* Sent Requests Section */}
            {sentRequests.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h4 style={{
                  color: '#1a202c',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📤</span>
                  Pending Requests You've Sent ({sentRequests.length})
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {sentRequests.map((request) => (
                    <div key={request.uid} style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: 'white',
                          fontWeight: '700'
                        }}>
                          {request.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                            {request.displayName}
                          </h5>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#f59e0b',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}>
                            <span>⏳</span>
                            <span>Pending approval</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help Section */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              marginTop: '30px'
            }}>
              <h4 style={{
                color: '#374151',
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                💡 How Following Works
              </h4>
              <ul style={{
                color: '#64748b',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                margin: 0,
                paddingLeft: '20px'
              }}>
                <li><strong>Public users:</strong> You can follow them immediately</li>
                <li><strong>Private users:</strong> You need to send a follow request</li>
                <li><strong>Friends:</strong> People who follow you and you follow them back</li>
                <li><strong>Recipes:</strong> You can see all recipes from people you follow</li>
              </ul>
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

export default FriendManagement;