import React, { useState, useEffect } from 'react';
import api from '../services/api';

function CommentList({ comments, isAuth, fetchComments, postId }) {
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emojiFilter, setEmojiFilter] = useState('all');
  const [filteredComments, setFilteredComments] = useState(comments);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  
  const emojis = ['💬', '😀', '😍', '👍', '❤️', '😢', '😮', '😡', '🤔', '🎉'];
  
  useEffect(() => {
    if (emojiFilter === 'all') {
      setFilteredComments(comments);
    } else {
      setFilteredComments(comments.filter(comment => comment.emoji === emojiFilter));
    }
  }, [comments, emojiFilter]);

  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };

  const handleEdit = (comment) => {
    setEditing(comment._id);
    setEditContent(comment.content);
  };

  const handleSave = async (id) => {
    setIsLoading(true);
    try {
      await api.put(`/comments/${id}`, { content: editContent });
      setEditing(null);
      fetchComments();
    } catch (err) {
      alert('Failed to update comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      setIsLoading(true);
      try {
        await api.delete(`/comments/${id}`);
        fetchComments();
      } catch (err) {
        alert('Failed to delete comment');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLike = async (commentId) => {
    try {
      await api.post(`/comments/${commentId}/like`);
      fetchComments();
    } catch (err) {
      alert('Failed to like comment');
    }
  };

  const handleEmojiChange = async (commentId, emoji) => {
    try {
      await api.put(`/comments/${commentId}/emoji`, { emoji });
      setShowEmojiPicker(null);
      fetchComments();
    } catch (err) {
      alert('Failed to update emoji');
    }
  };

  const isLikedByUser = (comment) => {
    const userId = localStorage.getItem('userId');
    return comment.likes?.some(like => like.user === userId);
  };

  if (!comments || comments.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '1.1rem'
      }}>
        💭 No comments yet. Be the first to share your thoughts!
      </div>
    );
  }

  return (
    <div>
      {/* Emoji Filter */}
      <div style={{ 
        marginBottom: '2rem', 
        display: 'flex', 
        gap: '0.5rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Filter by emoji:</span>
        <button
          onClick={() => setEmojiFilter('all')}
          className={`emoji-filter-btn ${emojiFilter === 'all' ? 'active' : ''}`}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '25px',
            background: emojiFilter === 'all' ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          All
        </button>
        {emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => setEmojiFilter(emoji)}
            className={`emoji-filter-btn ${emojiFilter === emoji ? 'active' : ''}`}
            style={{
              padding: '0.5rem',
              border: 'none',
              borderRadius: '50%',
              background: emojiFilter === emoji ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: emojiFilter === emoji ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="posts-grid">
        {filteredComments.map((comment, index) => (
        <article key={comment._id} className="post-card">
          {editing === comment._id ? (
            <div>
              <h4 className="form-title">Edit Comment</h4>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => handleSave(comment._id)}
                  className="submit-btn btn-hover-effect"
                  disabled={isLoading}
                  style={{ flex: 1 }}
                >
                  {isLoading ? (
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', margin: '0 auto' }}></div>
                  ) : (
                    '✅ Save'
                  )}
                </button>
                <button 
                  onClick={() => setEditing(null)}
                  className="submit-btn"
                  style={{ 
                    flex: 1,
                    background: 'var(--gradient-secondary)'
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="post-author" style={{ marginBottom: '1rem' }}>
                <div className="author-avatar">
                  {getInitials(comment.author?.username)}
                </div>
                <span>{comment.author?.username || 'Anonymous'}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem', cursor: 'pointer' }} 
                      onClick={() => setShowEmojiPicker(showEmojiPicker === comment._id ? null : comment._id)}>
                  {comment.emoji || '💬'}
                </span>
                {showEmojiPicker === comment._id && (
                  <div style={{
                    position: 'absolute',
                    zIndex: 1000,
                    background: 'var(--card-bg)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '0.5rem',
                    display: 'flex',
                    gap: '0.5rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}>
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiChange(comment._id, emoji)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '5px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p style={{ 
                color: 'var(--text-primary)', 
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                whiteSpace: 'pre-wrap'
              }}>
                {comment.content}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handleLike(comment._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isLikedByUser(comment) ? '#ff6b6b' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease',
                      transform: isLikedByUser(comment) ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    ❤️ {comment.likes?.length || 0}
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {isAuth && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEdit(comment)}
                      className="read-more-btn"
                      style={{ 
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        background: 'var(--gradient-accent)'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(comment._id)}
                      className="read-more-btn"
                      style={{ 
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                      }}
                      disabled={isLoading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
        ))}
      </div>
    </div>
  );
}

export default CommentList;
