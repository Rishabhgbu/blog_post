import axios from 'axios';

// Determine API base URL based on environment
// Priority:
// 1) REACT_APP_API_BASE (set in environment for deployments)
// 2) In production, default to same-origin "/api" to support reverse proxy setups
// 3) In development, default to local backend at http://localhost:3002/api
const getBaseUrl = () => {
  const envBase = process.env.REACT_APP_API_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim()) {
    return envBase.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    // window is safe to reference here in CRA client bundle
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3002/api';
};

const api = axios.create({
  baseURL: getBaseUrl()
});

// Enable mock mode when:
// - REACT_APP_MOCK_API === 'true', OR
// - in production with no REACT_APP_API_BASE provided (so we can deploy frontend-only)
const MOCK = (process.env.REACT_APP_MOCK_API === 'true') ||
             (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_BASE);

if (MOCK) {
  // Utilities for mock storage
  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const nowIso = () => new Date().toISOString();
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Seed example data if empty
  const seedIfEmpty = () => {
    const posts = load('mock_posts', []);
    if (posts.length === 0) {
      const userId = localStorage.getItem('userId') || 'u_demo';
      const username = localStorage.getItem('username') || 'demo';
      const demoPost = {
        _id: uid(),
        title: 'Welcome to BlogSphere (Mock Mode)',
        content: 'This is a demo post rendered with a mocked API. Create posts and comments freely! They are saved to your browser localStorage.',
        tags: ['demo', 'mock'],
        imageUrl: '',
        videoUrl: '',
        likes: [],
        author: { _id: userId, username },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      save('mock_posts', [demoPost]);
      save('mock_comments', []);
    }
  };
  seedIfEmpty();

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // Axios custom adapter to intercept all requests
  api.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toLowerCase();
    // config.url may be absolute or relative; we only need the path part
    const a = document.createElement('a');
    a.href = config.url || '/';
    const path = a.pathname || '/';
    // Remove '/api' prefix if present, since baseURL often sets it
    const route = path.replace(/^\/api\b/, '') || '/';

    // Optional small delay to mimic network
    await delay(120);

    const posts = load('mock_posts', []);
    const comments = load('mock_comments', []);

    const ok = (data, status = 200) => ({
      data,
      status,
      statusText: 'OK',
      headers: {},
      config,
    });
    const notFound = () => ({
      data: { msg: 'Not Found (mock)' },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
    });
    const badRequest = (msg = 'Bad Request') => ({
      data: { msg },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config,
    });

    // Handle uploads mock endpoints
    if (method === 'post' && route.startsWith('/uploads/')) {
      const type = path.includes('image') ? 'image' : 'video';
      const placeholder = type === 'image'
        ? 'https://picsum.photos/seed/mock/800/400'
        : 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4';
      return ok({ url: placeholder });
    }

    // Posts collection
    if (method === 'get' && route === '/posts') {
      const p = (config.params || {});
      let list = posts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (p.authorId) {
        list = list.filter(x => String((typeof x.author === 'object' ? x.author?._id : x.author)) === String(p.authorId));
      }
      return ok(list);
    }
    if (method === 'post' && route === '/posts') {
      const body = config.data && typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
      if (!body.title || !body.content) return badRequest('Title and content are required');
      const userId = localStorage.getItem('userId') || 'u_demo';
      const username = localStorage.getItem('username') || 'demo';
      const newPost = {
        _id: uid(),
        title: body.title,
        content: body.content,
        tags: Array.isArray(body.tags) ? body.tags : [],
        imageUrl: body.imageUrl || '',
        videoUrl: body.videoUrl || '',
        likes: [],
        author: { _id: userId, username },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const next = [newPost, ...posts];
      save('mock_posts', next);
      return ok(newPost, 201);
    }
    if (method === 'get' && route.startsWith('/posts/')) {
      const id = route.split('/')[2];
      const item = posts.find(p => p._id === id);
      return item ? ok(item) : notFound();
    }
    if (method === 'delete' && route.startsWith('/posts/')) {
      const id = route.split('/')[2];
      const next = posts.filter(p => p._id !== id);
      save('mock_posts', next);
      return ok({ msg: 'Deleted' });
    }
    if (method === 'post' && /\/posts\/[^/]+\/like$/.test(route)) {
      const id = route.split('/')[2];
      const userId = localStorage.getItem('userId') || 'u_demo';
      const idx = posts.findIndex(p => p._id === id);
      if (idx === -1) return notFound();
      const post = { ...posts[idx] };
      const liked = (post.likes || []).some(l => l.user === userId);
      post.likes = liked ? post.likes.filter(l => l.user !== userId) : [...(post.likes || []), { user: userId }];
      post.updatedAt = nowIso();
      const next = posts.slice();
      next[idx] = post;
      save('mock_posts', next);
      return ok(post);
    }

    // Comments collection
    if (method === 'get' && route === '/comments') {
      const p = (config.params || {});
      const list = comments.filter(c => !p.post_id || c.post_id === p.post_id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return ok(list);
    }
    if (method === 'post' && route === '/comments') {
      const body = config.data && typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
      if (!body.content || !body.post_id) return badRequest('content and post_id are required');
      const userId = localStorage.getItem('userId') || 'u_demo';
      const username = localStorage.getItem('username') || 'demo';
      const newComment = {
        _id: uid(),
        post_id: body.post_id,
        content: body.content,
        emoji: body.emoji || '💬',
        likes: [],
        author: { _id: userId, username },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const next = [newComment, ...comments];
      save('mock_comments', next);
      return ok(newComment, 201);
    }
    if (method === 'put' && /\/comments\/[^/]+$/.test(route)) {
      const id = route.split('/')[2];
      const body = config.data && typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
      const idx = comments.findIndex(c => c._id === id);
      if (idx === -1) return notFound();
      const c = { ...comments[idx], content: body.content ?? comments[idx].content, updatedAt: nowIso() };
      const next = comments.slice();
      next[idx] = c;
      save('mock_comments', next);
      return ok(c);
    }
    if (method === 'put' && /\/comments\/[^/]+\/emoji$/.test(route)) {
      const id = route.split('/')[2];
      const body = config.data && typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
      const idx = comments.findIndex(c => c._id === id);
      if (idx === -1) return notFound();
      const c = { ...comments[idx], emoji: body.emoji || '💬', updatedAt: nowIso() };
      const next = comments.slice();
      next[idx] = c;
      save('mock_comments', next);
      return ok(c);
    }
    if (method === 'delete' && /\/comments\/[^/]+$/.test(route)) {
      const id = route.split('/')[2];
      const next = comments.filter(c => c._id !== id);
      save('mock_comments', next);
      return ok({ msg: 'Deleted' });
    }
    if (method === 'post' && /\/comments\/[^/]+\/like$/.test(route)) {
      const id = route.split('/')[2];
      const userId = localStorage.getItem('userId') || 'u_demo';
      const idx = comments.findIndex(c => c._id === id);
      if (idx === -1) return notFound();
      const c = { ...comments[idx] };
      const liked = (c.likes || []).some(l => l.user === userId);
      c.likes = liked ? c.likes.filter(l => l.user !== userId) : [...(c.likes || []), { user: userId }];
      c.updatedAt = nowIso();
      const next = comments.slice();
      next[idx] = c;
      save('mock_comments', next);
      return ok(c);
    }

    // Fallback
    return notFound();
  };
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
    console.log('Token being sent:', token.substring(0, 20) + '...');
  } else {
    console.log('No token found in localStorage');
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor to handle token errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.log('Authentication error, clearing localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      // Optionally redirect to login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;