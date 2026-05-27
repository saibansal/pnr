import React, { useState, useEffect } from 'react';

// A simple custom Link component to avoid needing react-router-dom
const Link = ({ to, children, style }) => {
  const onClick = (e) => {
    e.preventDefault();
    window.history.pushState({}, '', to);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };
  return <a href={to} onClick={onClick} style={style}>{children}</a>;
};

const headerStyle = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: '15px 30px', 
  backgroundColor: '#004085', 
  color: '#fff', 
  fontFamily: 'sans-serif' 
};
const logoStyle = { display: 'flex', alignItems: 'center', fontSize: '20px' };
const navStyle = { display: 'flex', gap: '20px' };
const linkStyle = { color: '#fff', textDecoration: 'none', fontSize: '16px' };

const Header = () => {
  const [path, setPath] = useState(window.location.pathname);
  
  useEffect(() => {
    const onLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  return (
    <header style={headerStyle}>
      <div style={logoStyle}>
        <span style={{ fontSize: '24px', marginRight: '10px' }}>🚂</span>
        <strong>RailChecker</strong>
      </div>
      <nav style={navStyle}>
        <Link 
          to="/" 
          style={{ ...linkStyle, fontWeight: path === '/' ? 'bold' : 'normal', textDecoration: path === '/' ? 'underline' : 'none' }}
        >
          Home
        </Link>
        <Link 
          to="/pnr" 
          style={{ ...linkStyle, fontWeight: path.startsWith('/pnr') ? 'bold' : 'normal', textDecoration: path.startsWith('/pnr') ? 'underline' : 'none' }}
        >
          PNR Management
        </Link>
        <Link 
          to="/admin" 
          style={{ ...linkStyle, fontWeight: path.startsWith('/admin') ? 'bold' : 'normal', textDecoration: path.startsWith('/admin') ? 'underline' : 'none' }}
        >
          Admin
        </Link>
      </nav>
    </header>
  );
};

export default Header;