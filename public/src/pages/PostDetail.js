import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import CommentList from '../components/CommentList';

function PostDetail({ isAuth }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/posts/${id}`);
      setPost(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get('/comments', { params: { post_id: id } });
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };

  const isMyPost = () => {
    const userId = localStorage.getItem('userId');
    const authorId = typeof post?.author === 'object' ? post?.author?._id : post?.author;
    return userId && authorId && userId === String(authorId);
  };

  const handleDeletePost = async () => {
    if (!isMyPost()) return;
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/posts/${id}`);
      window.history.length > 1 ? window.history.back() : (window.location.href = '/my-posts');
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/comments', { 
        content: newComment, 
        post_id: id,
        emoji: selectedEmoji 
      });
      setNewComment('');
      setSelectedEmoji('💬');
      fetchComments();
    } catch (err) {
      alert('Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async () => {
    try {
      const res = await api.post(`/posts/${id}/like`);
      setPost(res.data);
    } catch (err) {
      alert('Failed to like post');
    }
  };

  const isLikedByUser = () => {
    const userId = localStorage.getItem('userId');
    return post.likes?.some(like => like.user === userId);
  };

  if (!post) return (
    <div className="loading">
      <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div>
      {/* Post Content */}
      <article className="post-form" style={{ marginBottom: '3rem' }}>
        <h1 className="post-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          {post.title}
        </h1>
        
        <div className="post-author" style={{ marginBottom: '2rem' }}>
          <div className="author-avatar">
            {getInitials(post.author?.username)}
          </div>
          <span>By {post.author?.username || 'Anonymous'}</span>
          <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.5)', fontSize: '0.9rem' }}>
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        <div style={{ 
          fontSize: '1.1rem', 
          lineHeight: '1.8', 
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          marginBottom: '2rem'
        }}>
          {post.content}
        </div>

        {/* Media */}
        {post.imageUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            <img 
              src={post.imageUrl} 
              alt={post.title || 'Post image'} 
              style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
        {post.videoUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            <video 
              src={post.videoUrl} 
              controls 
              style={{ width: '100%', borderRadius: '12px' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Post Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <button
            onClick={handleLikePost}
            className={`like-btn ${isLikedByUser() ? 'liked' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              color: isLikedByUser() ? '#ff6b6b' : 'rgba(0,0,0,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              padding: '0.5rem 1rem',
              borderRadius: '25px',
              transition: 'all 0.3s ease'
            }}
          >
            ❤️ {post.likes?.length || 0} {post.likes?.length === 1 ? 'Like' : 'Likes'}
          </button>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {post.tags.map((tag, index) => (
                  <span key={index} style={{
                    background: 'var(--gradient-accent)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {isMyPost() && (
              <button 
                onClick={handleDeletePost}
                className="read-more-btn"
                style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' }}
                title="Delete post"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section>
        <h2 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '2rem',
          fontFamily: 'Playfair Display, serif'
        }}>
          💬 Comments
        </h2>
        
        {isAuth && (
          <div className="post-form">
            <h3 className="form-title">Add Your Comment</h3>
            <form onSubmit={handleAddComment}>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Choose emoji:</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['💬', '😀', '😍', '👍', '❤️', '😢', '😮', '😡', '🤔', '🎉'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`emoji-filter-btn ${selectedEmoji === emoji ? 'active' : ''}`}
                        style={{
                          padding: '0.5rem',
                          border: 'none',
                          borderRadius: '50%',
                          background: selectedEmoji === emoji ? 'var(--gradient-primary)' : 'rgba(0,0,0,0.1)',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="submit-btn btn-hover-effect"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', margin: '0 auto' }}></div>
                ) : (
                  `${selectedEmoji} Post Comment`
                )}
              </button>
            </form>
          </div>
        )}
        
        <CommentList comments={comments} isAuth={isAuth} fetchComments={fetchComments} postId={id} />
      </section>
    </div>
  );
}

export default PostDetail;
