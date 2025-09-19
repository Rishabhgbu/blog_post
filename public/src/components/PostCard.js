import React from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function PostCard({ post, onDeleted }) {
  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };

  const truncateContent = (content, maxLength = 150) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  const handleLike = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to like posts');
        return;
      }
      await api.post(`/posts/${post._id}/like`);
      // Refresh the page or update state to reflect the like
      window.location.reload();
    } catch (err) {
      console.error('Failed to like post:', err);
      if (err.response?.status === 401) {
        alert('Please login to like posts');
      } else {
        alert('Failed to like post. Please try again.');
      }
    }
  };

  const isLikedByUser = () => {
    const userId = localStorage.getItem('userId');
    return post.likes?.some(like => like.user === userId);
  };

  const isMyPost = () => {
    const userId = localStorage.getItem('userId');
    // author may be populated object with _id or just id string
    const authorId = typeof post.author === 'object' ? post.author?._id : post.author;
    return userId && authorId && userId === String(authorId);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!isMyPost()) return;
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      if (onDeleted) {
        onDeleted(post._id);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  // Helpers for detecting embeddable video URLs (YouTube/Vimeo)
  const getYouTubeEmbed = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  const getVimeoEmbed = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <article className="post-card fade-in-on-scroll">
      <h3 className="post-title">{post.title}</h3>
      
      <div className="post-author" style={{ marginBottom: '1rem' }}>
        <div className="author-avatar">
          {getInitials(post.author?.username)}
        </div>
        <span>By {post.author?.username || 'Anonymous'}</span>
        <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      {post.content && (
        <p className="post-excerpt">
          {truncateContent(post.content)}
        </p>
      )}

      {/* Media Preview */}
      {post.imageUrl && (
        <div style={{ marginBottom: '1rem' }}>
          <img 
            src={post.imageUrl} 
            alt={post.title || 'Post image'} 
            style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
      {post.videoUrl && (() => {
        const yt = getYouTubeEmbed(post.videoUrl);
        const vm = getVimeoEmbed(post.videoUrl);
        if (yt || vm) {
          const src = yt || vm;
          return (
            <div style={{ marginBottom: '1rem', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={src}
                title={post.title || 'Embedded video'}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: '12px' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <div style={{ marginBottom: '1rem' }}>
            <video
              src={post.videoUrl}
              controls
              style={{ width: '100%', borderRadius: '12px' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        );
      })()}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {post.tags.map((tag, index) => (
            <span key={index} style={{
              background: 'var(--gradient-accent)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <button
          onClick={handleLike}
          className={`like-btn ${isLikedByUser() ? 'liked' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: isLikedByUser() ? '#ff6b6b' : 'rgba(0,0,0,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            padding: '0.5rem',
            borderRadius: '20px',
            transition: 'all 0.3s ease'
          }}
        >
          ❤️ {post.likes?.length || 0}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isMyPost() && (
            <button
              onClick={handleDelete}
              className="read-more-btn"
              style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' }}
              title="Delete post"
            >
              🗑️ Delete
            </button>
          )}
          <Link to={`/posts/${post._id}`} className="read-more-btn">
            📖 Read More
          </Link>
        </div>
      </div>
    </article>
  );
}

export default PostCard;
