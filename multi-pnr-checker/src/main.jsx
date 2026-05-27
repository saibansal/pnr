import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PnrManagement from '../../PnrManagement.jsx'
import Header from '../../Header.jsx'
import './App.css'

// A simple custom router to avoid needing react-router-dom
const SimpleRouter = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  if (currentPath === '/') return <App />;
  if (currentPath.startsWith('/pnr')) return <PnrManagement />;
  if (currentPath.startsWith('/admin')) return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <Header />
      <h2 style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>Admin Page (Coming Soon)</h2>
    </div>
  );

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimpleRouter />
  </React.StrictMode>,
)
