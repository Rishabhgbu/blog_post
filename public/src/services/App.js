import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Home from '../pages/Home';
import MyPosts from '../pages/MyPosts';
import PostDetail from '../pages/PostDetail';
import '../styles/App.css';

function App() {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Check for valid authentication token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Try to decode the token to check if it's valid format
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Check if token is expired
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          console.log('Token expired, clearing localStorage');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          setIsAuth(false);
        } else {
          console.log('Valid token found, setting authenticated state');
          setIsAuth(true);
        }
      } catch (e) {
        // Invalid token format, clear it
        console.log('Invalid token format, clearing localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setIsAuth(false);
      }
    } else {
      setIsAuth(false);
    }
  }, []);

  return (
    <Router>
      <AppContent isAuth={isAuth} setIsAuth={setIsAuth} />
    </Router>
  );
}

function AppContent({ isAuth, setIsAuth }) {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    // Handle scroll to top button visibility
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuth(false);
    navigate('/login');
  };

  const handleButtonClick = (_e, callback) => {
    if (callback) callback();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Floating Background Elements */}
      <div className="floating-elements">
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
      </div>
      
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-content">
          <Link to="/" className="logo">✨ BlogSphere</Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">All Posts</Link>
            <Link to="/my-posts" className="nav-link">My Posts</Link>
            {!isAuth ? (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
              </>
            ) : (
              <button 
                onClick={(e) => handleButtonClick(e, handleLogout)} 
                className="logout-btn btn-hover-effect"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home isAuth={isAuth} />} />
          <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/posts/:id" element={<PostDetail isAuth={isAuth} />} />
          <Route path="/my-posts" element={isAuth ? <MyPosts /> : <Navigate to="/login" replace />} />
        </Routes>
      </main>
      
      {/* Scroll to Top Button */}
      <button 
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={(e) => handleButtonClick(e, scrollToTop)}
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </div>
  );
}

export default App;