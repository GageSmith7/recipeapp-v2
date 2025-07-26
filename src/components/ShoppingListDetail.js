import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ShoppingListDetail = ({ list, onBack, onUpdate }) => {
  const [items, setItems] = useState(list.items || []);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleItemToggle = async (itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    
    // Update in Firestore
    try {
      await updateDoc(doc(db, 'shoppingLists', list.id), {
        items: updatedItems,
        updatedAt: new Date()
      });
      if (onUpdate) onUpdate(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const itemToAdd = {
      id: `${Date.now()}-${Math.random()}`,
      name: newItem.name.trim(),
      quantity: newItem.quantity.trim(),
      unit: newItem.unit.trim(),
      checked: false,
      sourceRecipeIds: [],
      sourceRecipeNames: [],
      isCustom: true
    };

    const updatedItems = [...items, itemToAdd];
    setItems(updatedItems);
    setNewItem({ name: '', quantity: '', unit: '' });
    setShowAddItem(false);

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'shoppingLists', list.id), {
        items: updatedItems,
        updatedAt: new Date()
      });
      if (onUpdate) onUpdate(updatedItems);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async (itemId, updatedData) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, ...updatedData } : item
    );
    setItems(updatedItems);
    setEditingItem(null);

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'shoppingLists', list.id), {
        items: updatedItems,
        updatedAt: new Date()
      });
      if (onUpdate) onUpdate(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'shoppingLists', list.id), {
        items: updatedItems,
        updatedAt: new Date()
      });
      if (onUpdate) onUpdate(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyToClipboard = () => {
    const formattedList = formatListForSharing();
    navigator.clipboard.writeText(formattedList);
    setShowShareModal(false);
    alert('Shopping list copied to clipboard!');
  };

  const formatListForSharing = () => {
    const checkedItems = items.filter(item => item.checked);
    const uncheckedItems = items.filter(item => !item.checked);
    
    let formatted = `${list.name}\n\n`;
    
    if (uncheckedItems.length > 0) {
      formatted += 'To Buy:\n';
      uncheckedItems.forEach(item => {
        const quantity = item.quantity ? `${item.quantity} ` : '';
        const unit = item.unit ? `${item.unit} ` : '';
        formatted += `☐ ${quantity}${unit}${item.name}\n`;
      });
    }
    
    if (checkedItems.length > 0) {
      formatted += '\nPurchased:\n';
      checkedItems.forEach(item => {
        const quantity = item.quantity ? `${item.quantity} ` : '';
        const unit = item.unit ? `${item.unit} ` : '';
        formatted += `☑ ${quantity}${unit}${item.name}\n`;
      });
    }
    
    return formatted;
  };

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '25px 30px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ 
                margin: 0, 
                color: 'white',
                fontSize: '2rem',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {list.name}
              </h1>
              <p style={{
                margin: '8px 0 0 0',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '1rem',
                fontWeight: '400'
              }}>
                {checkedCount} of {totalCount} items purchased
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ➕ Add Item
            </button>
            <button
              onClick={handleShare}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(5px)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: '40px 30px', 
        maxWidth: '800px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Progress Bar */}
        {totalCount > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#666', fontSize: '14px' }}>
                Progress: {checkedCount} of {totalCount} items
              </span>
              <span style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                {Math.round((checkedCount / totalCount) * 100)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(checkedCount / totalCount) * 100}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Add Item Form */}
        {showAddItem && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
              Add Custom Item
            </h3>
            <form onSubmit={handleAddItem}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Quantity"
                  value={newItem.quantity}
                  onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={newItem.unit}
                  onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No items yet</h3>
              <p style={{ margin: 0, color: '#666' }}>Add some items to get started</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  opacity: item.checked ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleItemToggle(item.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  
                  {editingItem === item.id ? (
                    <EditItemForm
                      item={item}
                      onSave={(updatedData) => handleEditItem(item.id, updatedData)}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          color: item.checked ? '#999' : '#333',
                          fontSize: '16px',
                          fontWeight: '500',
                          textDecoration: item.checked ? 'line-through' : 'none'
                        }}>
                          {item.quantity && `${item.quantity} `}
                          {item.unit && `${item.unit} `}
                          {item.name}
                        </span>
                        {item.isCustom && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#10b981',
                            color: 'white'
                          }}>
                            Custom
                          </span>
                        )}
                      </div>
                      
                      {item.sourceRecipeNames && item.sourceRecipeNames.length > 0 && (
                        <p style={{ 
                          margin: '4px 0 0 0', 
                          color: '#666', 
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}>
                          From: {item.sourceRecipeNames.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {editingItem !== item.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#667eea',
                          fontSize: '16px',
                          padding: '4px'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: '16px',
                          padding: '4px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Share Shopping List</h3>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Preview:</h4>
              <pre style={{
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.5',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {formatListForSharing()}
              </pre>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCopyToClipboard}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Item Form Component
const EditItemForm = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedItem);
  };

  return (
    <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: '8px' }}>
      <input
        type="text"
        placeholder="Qty"
        value={editedItem.quantity}
        onChange={e => setEditedItem({ ...editedItem, quantity: e.target.value })}
        style={{
          width: '60px',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          fontSize: '14px'
        }}
      />
      <input
        type="text"
        placeholder="Unit"
        value={editedItem.unit}
        onChange={e => setEditedItem({ ...editedItem, unit: e.target.value })}
        style={{
          width: '80px',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          fontSize: '14px'
        }}
      />
      <input
        type="text"
        placeholder="Item name"
        value={editedItem.name}
        onChange={e => setEditedItem({ ...editedItem, name: e.target.value })}
        style={{
          flex: 1,
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          fontSize: '14px'
        }}
        required
      />
      <button
        type="submit"
        style={{
          background: '#10b981',
          borderRadius: '6px',
          padding: '8px 12px',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontSize: '14px'
        }}
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: '#6b7280',
          borderRadius: '6px',
          padding: '8px 12px',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontSize: '14px'
        }}
      >
        Cancel
      </button>
    </form>
  );
};

export default ShoppingListDetail; 