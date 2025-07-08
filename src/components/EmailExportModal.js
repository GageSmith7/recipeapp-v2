import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

const EmailExportModal = ({ recipe, user, isOpen, onClose }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [emailsToday, setEmailsToday] = useState(0);

  // Check daily email limit (stored in localStorage)
  React.useEffect(() => {
    if (isOpen) {
      const today = new Date().toDateString();
      const lastEmailDate = localStorage.getItem('lastEmailDate');
      const dailyCount = parseInt(localStorage.getItem('dailyEmailCount') || '0');
      
      if (lastEmailDate === today) {
        setEmailsToday(dailyCount);
      } else {
        setEmailsToday(0);
        localStorage.setItem('lastEmailDate', today);
        localStorage.setItem('dailyEmailCount', '0');
      }
    }
  }, [isOpen]);

  // Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Format recipe for email
  const formatRecipeForEmail = () => {
    const creator = recipe.originalCreator 
      ? `Originally created by: ${recipe.creatorInfo?.displayName || 'A friend'}`
      : `Created by: You`;
    
    const ingredientsList = recipe.ingredients?.map(ingredient => 
      `• ${ingredient}`
    ).join('\n') || 'No ingredients listed';

    const instructions = recipe.instructions || 'No instructions provided';

    const categoryEmoji = {
      breakfast: '🌅',
      lunch: '🥙', 
      dinner: '🍽️',
      snack: '🍿',
      dessert: '🍰'
    };

    return {
      subject: `Recipe: ${recipe.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .footer { background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e2e8f0; border-top: none; }
            .recipe-title { font-size: 2rem; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            .category-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; margin-top: 10px; }
            .section { margin: 30px 0; }
            .section-title { color: #1a202c; font-size: 1.3rem; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
            .ingredients { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .ingredient-item { margin: 8px 0; }
            .instructions { background: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
            .meta-info { color: #64748b; font-size: 0.9rem; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .message-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="recipe-title">🍳 ${recipe.title}</h1>
            <div class="category-badge">
              ${categoryEmoji[recipe.category] || '🍽️'} ${recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
            </div>
          </div>
          
          <div class="content">
            ${message.trim() ? `<div class="message-box"><strong>Personal Message:</strong><br>${message.replace(/\n/g, '<br>')}</div>` : ''}
            
            <div class="section">
              <h2 class="section-title">🥘 Ingredients</h2>
              <div class="ingredients">
                ${recipe.ingredients?.map(ingredient => `<div class="ingredient-item">• ${ingredient}</div>`).join('') || '<em>No ingredients listed</em>'}
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">📋 Instructions</h2>
              <div class="instructions">${instructions.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="meta-info">
              <div><strong>${creator}</strong></div>
              <div>Shared on: ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
              📱 Shared via <strong>CookBook</strong> - Your Personal Recipe Collection
            </p>
          </div>
        </body>
        </html>
      `
    };
  };

  const handleSend = async () => {
    if (emailsToday >= 10) {
      setError('Daily email limit reached (10 emails per day). Please try again tomorrow.');
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError('');

    try {
      const emailContent = formatRecipeForEmail();
      
      // EmailJS configuration - you'll need to set these up in your EmailJS account
      const templateParams = {
        to_email: recipientEmail,
        from_email: user.email,
        from_name: user.displayName || user.email.split('@')[0],
        subject: emailContent.subject,
        html_content: emailContent.html,
        recipe_title: recipe.title
      };

      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      // Update daily count
      const newCount = emailsToday + 1;
      setEmailsToday(newCount);
      localStorage.setItem('dailyEmailCount', newCount.toString());

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setRecipientEmail('');
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error('Email send error:', error);
      setError('Failed to send email. Please try again.');
    }

    setSending(false);
  };

  const handleClose = () => {
    setRecipientEmail('');
    setMessage('');
    setError('');
    setSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          padding: '24px',
          borderRadius: '16px 16px 0 0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '700' }}>
                📧 Share Recipe
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                Send "{recipe.title}" via email
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Daily limit warning */}
          <div style={{
            background: emailsToday >= 8 ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${emailsToday >= 8 ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            <strong style={{ color: emailsToday >= 8 ? '#dc2626' : '#059669' }}>
              Daily Usage: {emailsToday}/10 emails sent today
            </strong>
            {emailsToday >= 8 && (
              <div style={{ color: '#dc2626', marginTop: '4px' }}>
                ⚠️ Approaching daily limit
              </div>
            )}
          </div>

          {/* Recipient Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              📬 Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@example.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Personal Message */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              💬 Personal Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to your friend..."
              rows="3"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#dc2626',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Success Message */}
          {sent && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#059669',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✅</span>
              Recipe sent successfully!
            </div>
          )}

          {/* Preview */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '0.9rem' }}>
              📄 Email Preview:
            </h4>
            <div style={{
              fontSize: '0.85rem',
              color: '#64748b',
              lineHeight: '1.5'
            }}>
              <div><strong>To:</strong> {recipientEmail || 'recipient@example.com'}</div>
              <div><strong>From:</strong> {user.email}</div>
              <div><strong>Subject:</strong> Recipe: {recipe.title}</div>
              <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                Beautifully formatted recipe with ingredients, instructions, and your personal message.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleClose}
              disabled={sending}
              style={{
                padding: '12px 20px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                opacity: sending ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !recipientEmail || emailsToday >= 10 || sent}
              style={{
                padding: '12px 20px',
                background: (sending || !recipientEmail || emailsToday >= 10 || sent)
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (sending || !recipientEmail || emailsToday >= 10 || sent) ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              {sending ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Sending...
                </>
              ) : sent ? (
                <>
                  <span>✅</span>
                  Sent!
                </>
              ) : (
                <>
                  <span>📧</span>
                  Send Recipe
                </>
              )}
            </button>
          </div>
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

export default EmailExportModal;