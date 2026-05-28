import React from 'react';
import { Plus, Database } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, pnrCount }) {
  return (
    <div className="navbar-wrapper">
      <nav className="view-navbar glass">
        <button 
          onClick={() => setCurrentView('add')} 
          className={`nav-tab ${currentView === 'add' ? 'active' : ''}`}
          title="Add and Check New PNR"
        >
          <Plus size={18} />
          <span>Add PNR</span>
        </button>
        <button 
          onClick={() => setCurrentView('list')} 
          className={`nav-tab ${currentView === 'list' ? 'active' : ''}`}
          title="View Tracked PNRs"
        >
          <Database size={18} />
          <span>Tracked PNRs</span>
          {pnrCount > 0 && (
            <span className="pnr-count-badge">
              {pnrCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}
