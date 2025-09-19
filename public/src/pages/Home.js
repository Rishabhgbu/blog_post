import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';

function Home({ isAuth }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '', imageUrl: '', videoUrl: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState({ image: false, video: false });
  const [mediaErrors, setMediaErrors] = useState({ image: '', video: '' });
  const [filter, setFilter] = useState('all'); // 'all' | 'mine'

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  // ----- Helpers for URL validation and embed detection -----
  const isValidUrl = (val) => {
    if (!val) return true; // optional field
    try {
      const u = new URL(val);
      return !!u.protocol && (u.protocol === 'http:' || u.protocol === 'https:');
    } catch {
      return false;
    }
  };

  const uploadFile = async (file, type) => {
    const form = new FormData();
    form.append('file', file);
    const endpoint = type === 'image' ? '/uploads/image' : '/uploads/video';
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      const res = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data?.url || res.data?.path;
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const isLikelyImageUrl = (val) => {
    if (!val) return true;
    return /(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(val);
  };

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
    } catch { return null; }
  };

  const getVimeoEmbed = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return null;
    } catch { return null; }
  };

  const isSupportedVideoUrl = (val) => {
    if (!val) return true;
    if (getYouTubeEmbed(val) || getVimeoEmbed(val)) return true;
    return /(\.mp4|\.webm|\.ogg)(\?.*)?$/i.test(val);
  };

  const fetchPosts = async (overrideFilter) => {
    try {
      console.log('Fetching posts...');
      // Add cache-busting query to ensure we always get the latest posts
      const params = { t: Date.now() };
      const activeFilter = overrideFilter ?? filter;
      if (activeFilter === 'mine') {
        let userId = localStorage.getItem('userId');
        if (!userId) {
          // Fallback: try to decode JWT to get user id
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload?.user?.id;
              if (userId) {
                localStorage.setItem('userId', userId);
              }
            } catch (e) {
              console.log('Unable to decode token for userId:', e.message);
            }
          }
        }
        if (userId) params.authorId = userId;
      }
      console.log('Fetch params:', params);
      const res = await api.get(`/posts`, { params });
      console.log('Posts fetched:', Array.isArray(res.data) ? res.data.length : res.data);
      setPosts(res.data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
      console.error('Error response:', err.response);
      setPosts([]);
    }
  };

  // Explicit helpers to avoid any stale state issues
  const showAllPosts = async () => {
    console.log('Action: showAllPosts');
    setFilter('all');
    await fetchPosts('all');
  };

  const showMyPosts = async () => {
    console.log('Action: showMyPosts');
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to view your posts');
      return;
    }
    setFilter('mine');
    await fetchPosts('mine');
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    // Check authentication first
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to create posts');
      return;
    }
    
    // Validate inputs
    if (!newPost.title.trim()) {
      alert('Please enter a title for your post');
      return;
    }
    
    if (!newPost.content.trim()) {
      alert('Please enter content for your post');
      return;
    }
    
    if (newPost.content.trim().length < 10) {
      alert('Post content must be at least 10 characters long');
      return;
    }
    
    // Validate optional media URLs before posting
    const imageValid = isValidUrl(newPost.imageUrl) && (newPost.imageUrl ? isLikelyImageUrl(newPost.imageUrl) : true);
    const videoValid = isValidUrl(newPost.videoUrl) && (newPost.videoUrl ? isSupportedVideoUrl(newPost.videoUrl) : true);
    const nextErrors = {
      image: imageValid ? '' : 'Invalid image URL. Use a direct image link (.png, .jpg, .gif...)',
      video: videoValid ? '' : 'Invalid video URL. Use YouTube/Vimeo link or direct MP4/WebM/Ogg link.'
    };
    setMediaErrors(nextErrors);
    if (!imageValid || !videoValid) {
      alert('Please fix media URL errors before publishing.');
      return;
    }

    setIsLoading(true);
    try {
      const postData = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        tags: newPost.tags ? newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        imageUrl: newPost.imageUrl?.trim() || '',
        videoUrl: newPost.videoUrl?.trim() || ''
      };
      
      console.log('Creating post with data:', postData);
      console.log('Using token:', token.substring(0, 20) + '...');
      
      const response = await api.post('/posts', postData);
      console.log('Post created successfully:', response.data);
      
      // Optimistically prepend the new post so it appears immediately
      setPosts(prev => [response.data, ...prev]);
      
      setNewPost({ title: '', content: '', tags: '', imageUrl: '', videoUrl: '' });
      // Also refetch to ensure ordering and data integrity, keeping current view
      await fetchPosts(filter);
      alert('Post created successfully!');
    } catch (err) {
      console.error('Error creating post:', err);
      console.error('Error response:', err.response);
      
      if (err.response?.status === 401) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = '/login';
      } else if (err.response?.data?.msg) {
        alert(`Failed to create post: ${err.response.data.msg}`);
      } else if (err.response?.data?.errors) {
        alert(`Validation errors: ${err.response.data.errors.join(', ')}`);
      } else {
        alert('Failed to create post. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{textAlign: 'center', margin: '0.5rem 0', color: 'var(--text-secondary)'}}>
        Viewing: <strong>{filter === 'mine' ? 'My Posts' : 'All Posts'}</strong> • Total: <strong>{posts.length}</strong>
      </div>
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Welcome to BlogSphere</h1>
        <p className="hero-subtitle">
          Discover amazing stories, share your thoughts, and connect with writers from around the world
        </p>
      </section>

      {/* Filter Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
        <button
          type="button"
          className="submit-btn btn-hover-effect filter-btn"
          style={{ opacity: filter === 'all' ? 1 : 0.7 }}
          aria-pressed={filter === 'all'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('All Posts button clicked');
            // Navigate to home and refetch explicitly for reliability
            navigate('/');
            showAllPosts();
          }}
        >
          🌐 All Posts
        </button>
        <button
          type="button"
          className="submit-btn btn-hover-effect filter-btn"
          style={{ opacity: filter === 'mine' ? 1 : 0.7 }}
          aria-pressed={filter === 'mine'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('My Posts button clicked');
            // Navigate to dedicated My Posts page
            navigate('/my-posts');
          }}
        >
          👤 My Posts
        </button>
      </div>

      {/* Post Creation Form */}
      {isAuth && (
        <div className="post-form">
          <h2 className="form-title">✍️ Create New Post</h2>
          <form onSubmit={handleCreatePost} noValidate>
            <div className="form-group">
              <input
                className="form-input"
                placeholder="What's your story title?"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-textarea"
                placeholder="Share your thoughts and ideas..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                required
                style={{ minHeight: '120px' }}
              />
            </div>
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Image URL (optional)"
                value={newPost.imageUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPost({ ...newPost, imageUrl: val });
                  const ok = isValidUrl(val) && (val ? isLikelyImageUrl(val) : true);
                  setMediaErrors(prev => ({ ...prev, image: ok ? '' : 'Invalid image URL. Use a direct image link (.png, .jpg, .gif...)' }));
                }}
                inputMode="url"
              />
              {mediaErrors.image && (
                <small style={{ color: '#c0392b' }}>{mediaErrors.image}</small>
              )}
              {/* Or upload from device */}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadFile(file, 'image');
                      setNewPost(prev => ({ ...prev, imageUrl: url || prev.imageUrl }));
                      setMediaErrors(prev => ({ ...prev, image: '' }));
                    } catch (err) {
                      console.error('Image upload failed:', err);
                      setMediaErrors(prev => ({ ...prev, image: 'Image upload failed' }));
                    }
                  }}
                  disabled={uploading.image}
                />
                {uploading.image && <small style={{ color: 'var(--text-secondary)' }}>Uploading image...</small>}
              </div>
              {/* Live image preview */}
              {newPost.imageUrl && !mediaErrors.image && (
                <div style={{ marginTop: '0.75rem' }}>
                  <img
                    src={newPost.imageUrl}
                    alt="Preview"
                    style={{ maxWidth: '100%', borderRadius: '10px' }}
                    onError={() => setMediaErrors(prev => ({ ...prev, image: 'Image could not be loaded.' }))}
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Video URL (optional, e.g., MP4 link)"
                value={newPost.videoUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPost({ ...newPost, videoUrl: val });
                  const ok = isValidUrl(val) && (val ? isSupportedVideoUrl(val) : true);
                  setMediaErrors(prev => ({ ...prev, video: ok ? '' : 'Invalid video URL. Use YouTube/Vimeo link or direct MP4/WebM/Ogg link.' }));
                }}
                inputMode="url"
              />
              {mediaErrors.video && (
                <small style={{ color: '#c0392b' }}>{mediaErrors.video}</small>
              )}
              {/* Or upload from device */}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadFile(file, 'video');
                      setNewPost(prev => ({ ...prev, videoUrl: url || prev.videoUrl }));
                      setMediaErrors(prev => ({ ...prev, video: '' }));
                    } catch (err) {
                      console.error('Video upload failed:', err);
                      setMediaErrors(prev => ({ ...prev, video: 'Video upload failed' }));
                    }
                  }}
                  disabled={uploading.video}
                />
                {uploading.video && <small style={{ color: 'var(--text-secondary)' }}>Uploading video...</small>}
              </div>
              {/* Live video preview (YouTube/Vimeo/embed or native) */}
              {newPost.videoUrl && !mediaErrors.video && (
                (() => {
                  const yt = getYouTubeEmbed(newPost.videoUrl);
                  const vm = getVimeoEmbed(newPost.videoUrl);
                  if (yt || vm) {
                    const src = yt || vm;
                    return (
                      <div style={{ marginTop: '0.75rem', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={src}
                          title="Video preview"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: '10px' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  return (
                    <div style={{ marginTop: '0.75rem' }}>
                      <video
                        src={newPost.videoUrl}
                        controls
                        style={{ width: '100%', borderRadius: '10px' }}
                        onError={() => setMediaErrors(prev => ({ ...prev, video: 'Video could not be loaded.' }))}
                      />
                    </div>
                  );
                })()
              )}
            </div>
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Tags (comma-separated, e.g., technology, lifestyle, travel)"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
              />
              <small style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                Add tags to help others discover your post
              </small>
            </div>
            <button 
              type="submit" 
              className="submit-btn btn-hover-effect"
              disabled={isLoading || uploading.image || uploading.video}
              onClick={(e) => {
                console.log('Post button clicked');
                console.log('Form data:', newPost);
                console.log('Is authenticated:', isAuth);
                console.log('Token exists:', !!localStorage.getItem('token'));
              }}
            >
              {isLoading || uploading.image || uploading.video ? (
                <div className="loading-spinner" style={{ width: '20px', height: '20px', margin: '0 auto' }}></div>
              ) : (
                '🚀 Publish Post'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Posts Grid */}
      <div className="posts-grid">
        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post}
              onDeleted={(id) => setPosts(prev => prev.filter(p => p._id !== id))}
            />
          ))
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1.1rem',
            gridColumn: '1 / -1'
          }}>
            📝 No posts yet. {isAuth ? 'Create the first post!' : 'Login to create posts!'}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
