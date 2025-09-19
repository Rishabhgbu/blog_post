import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchMyPosts = async () => {
    setLoading(true);
    try {
      console.log('[MyPosts] fetching my posts via /posts/mine ...');
      const res = await api.get('/posts/mine', { params: { t: Date.now() } });
      console.log('[MyPosts] posts fetched:', Array.isArray(res.data) ? res.data.length : res.data);
      setPosts(res.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading my posts (mine endpoint):', err);
      // Fallback: try authorId query if token route failed for any reason other than 401
      const status = err.response?.status;
      if (status === 401) {
        alert('Please login to view your posts');
        navigate('/login');
        return;
      }
      try {
        console.log('[MyPosts] fallback: fetching via /posts?authorId=...');
        let userId = localStorage.getItem('userId');
        if (!userId) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload?.user?.id;
              if (userId) localStorage.setItem('userId', userId);
            } catch (e) {
              console.log('[MyPosts] failed to decode token for userId');
            }
          }
        }
        if (!userId) {
          setError('Failed to load your posts. Please login again.');
          setPosts([]);
        } else {
          const res2 = await api.get('/posts', { params: { authorId: userId, t: Date.now() } });
          console.log('[MyPosts] fallback posts fetched:', Array.isArray(res2.data) ? res2.data.length : res2.data);
          setPosts(res2.data || []);
          setError('');
        }
      } catch (e2) {
        console.error('Fallback also failed:', e2);
        setError('Failed to load your posts. Please try again.');
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchMyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <section className="hero-section compact">
        <h1 className="hero-title" style={{ marginBottom: '0.5rem' }}>My Posts</h1>
        <p className="hero-subtitle">All posts you have created</p>
      </section>

      {loading ? (
        <div className="loading"><div className="loading-spinner" /></div>
      ) : (
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', gridColumn: '1 / -1' }}>
              {error || "You haven't created any posts yet."}
              <div style={{ marginTop: '1rem' }}>
                <button className="submit-btn filter-btn" type="button" onClick={fetchMyPosts}>↻ Reload</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyPosts;
