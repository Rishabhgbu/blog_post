import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Login({ setIsAuth }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      alert('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    try {
      // Clear any existing tokens first
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      
      const res = await api.post('/auth/login', formData);
      console.log('Login response:', res.data);
      
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('username', res.data.user.username);
      }
      setIsAuth(true);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.msg || 'Login failed. Please check your credentials.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-title">🔐 Welcome Back</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Sign in to your account to continue
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              className="form-input"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>
          
          <div className="form-group">
            <input
              className="form-input"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
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
              '🚀 Sign In'
            )}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
