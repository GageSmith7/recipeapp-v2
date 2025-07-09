import React from 'react';

export default function RecipeCard({ recipe, onSelect }) {
    return (
        <div
          onClick={() => onSelect(recipe)}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '0',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            overflow: 'hidden',
            position: 'relative',
            height: '280px',
            display: 'flex',
            flexDirection: 'column'
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
          {/* Compact top decorative section */}
          <div style={{
            height: '60px', // Reduced from 80px
            background: `linear-gradient(135deg, 
              ${getRandomGradient(recipe.title)} 0%, 
              ${getRandomGradient(recipe.title, true)} 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background decoration */}
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '-10px',
              width: '30px',
              height: '30px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '50%'
            }} />
            
            {/* Recipe emoji/icon - positioned better */}
            <div style={{
              position: 'absolute',
              bottom: '1px', // Adjusted for smaller header
              right: '16px',
              width: '40px', // Slightly smaller
              height: '40px',
              background: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px', // Slightly smaller emoji
              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)'
            }}>
              {getRecipeEmoji(recipe.title)}
            </div>
          </div>
          
          {/* Content section - more space for content */}
          <div style={{ 
            padding: '20px 18px 16px 18px', // Adjusted padding
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Recipe Title */}
            <div>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                color: '#1a202c',
                fontSize: '1.25rem', // Slightly smaller but still prominent
                fontWeight: '700',
                lineHeight: '1.3',
                overflow: 'hidden',
                display: '-webkit-box',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                minHeight: '2.4rem',
                wordBreak: 'break-word'
              }}>
                {recipe.title}
              </h3>
              
              {/* Compact Category and Privacy Badges */}
              <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                marginBottom: '10px',
                flexWrap: 'wrap'
              }}>
                {/* Category Badge - Smaller */}
                <div style={{
                  padding: '4px 11px', // Reduced padding
                  background: `linear-gradient(135deg, ${getRandomGradient(recipe.title)}18, ${getRandomGradient(recipe.title, true)}18)`,
                  borderRadius: '12px', // Smaller border radius
                  fontSize: '.8rem', // Smaller font
                  fontWeight: '600',
                  color: getRandomGradient(recipe.title),
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: `1px solid ${getRandomGradient(recipe.title)}25`
                }}>
                  <span style={{ fontSize: '8px' }}>{getCategoryEmoji(recipe.category)}</span>
                  {getCategoryLabel(recipe.category)}
                </div>
              </div>
              
              {/* Instructions Preview - Compact */}
              {recipe.instructions && (
                <p style={{ 
                  margin: '0 0 14px 0', 
                  color: '#64748b', 
                  fontSize: '0.85rem', // Slightly smaller
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  height: '2.4rem'
                }}>
                  {recipe.instructions.length > 90 
                    ? `${recipe.instructions.substring(0, 90)}...` 
                    : recipe.instructions
                  }
                </p>
              )}
            </div>
            
            {/* Bottom info section - Compact */}
            <div>
              {/* Recipe Stats - More compact */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'linear-gradient(135deg, #667eea12, #764ba212)',
                  padding: '5px 10px', // Smaller padding
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '12px' }}>🥘</span>
                  <span style={{ 
                    color: '#667eea', 
                    fontSize: '0.8rem', // Smaller
                    fontWeight: '600'
                  }}>
                    {recipe.ingredients?.length || 0} ingredients
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>📅</span>
                  <span style={{ 
                    fontSize: '0.7rem', // Smaller
                    color: '#94a3b8',
                    fontWeight: '500'
                  }}>
                    {recipe.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    }) || 'Recent'}
                  </span>
                </div>
              </div>
              
              {/* Click hint - Compact */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px', // Smaller padding
                borderRadius: '6px',
                background: 'rgba(102, 126, 234, 0.05)',
                transition: 'all 0.2s ease'
              }}>
                <span style={{
                  fontSize: '0.75rem', // Smaller
                  color: '#667eea',
                  fontWeight: '500'
                }}>
                  View Recipe
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#667eea'
                }}>
                  →
                </span>
              </div>
            </div>
          </div>
        </div>
      );
}

// Helper function to generate consistent colors based on recipe title
function getRandomGradient(title, secondary = false) {
  const gradients = [
    '#667eea', // Soft blue
    '#764ba2', // Soft purple
    '#f093fb', // Soft pink
    '#8b5fbf', // Muted purple
    '#6c5ce7', // Soft violet
    '#a29bfe', // Light purple
    '#fd79a8', // Soft rose
    '#e84393', // Muted pink
    '#74b9ff', // Soft sky blue
    '#0984e3', // Professional blue
    '#00b894', // Soft teal
    '#00cec9', // Muted turquoise
    '#fdcb6e', // Soft orange
    '#e17055'  // Muted coral
  ];
  
  // Use title to generate a consistent index
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % gradients.length;
  return secondary ? gradients[(index + 1) % gradients.length] : gradients[index];
}

// Helper function to get category emoji
function getCategoryEmoji(category) {
  const categoryMap = {
    breakfast: '🌅',
    lunch: '🥙', 
    dinner: '🍽️',
    snack: '🍿',
    dessert: '🍰',
    cocktail: '🍸'
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

// Helper function to get appropriate emoji based on recipe title
function getRecipeEmoji(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('cake') || titleLower.includes('dessert') || titleLower.includes('sweet')) {
    return '🍰';
  } else if (titleLower.includes('pasta') || titleLower.includes('spaghetti')) {
    return '🍝';
  } else if (titleLower.includes('pizza')) {
    return '🍕';
  } else if (titleLower.includes('burger') || titleLower.includes('sandwich')) {
    return '🍔';
  } else if (titleLower.includes('salad')) {
    return '🥗';
  } else if (titleLower.includes('soup')) {
    return '🍲';
  } else if (titleLower.includes('bread')) {
    return '🍞';
  } else if (titleLower.includes('fish') || titleLower.includes('salmon')) {
    return '🐟';
  } else if (titleLower.includes('chicken') || titleLower.includes('meat')) {
    return '🍗';
  } else if (titleLower.includes('drink') || titleLower.includes('smoothie')) {
    return '🥤';
  } else if (titleLower.includes('breakfast')) {
    return '🍳';
  } else {
    return '🍽️';
  }
}