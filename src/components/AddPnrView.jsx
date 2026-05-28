import React from 'react';
import { Train, Plus, RefreshCw, Info, ShieldCheck, RefreshCcw } from 'lucide-react';

export default function AddPnrView({ newPnr, setNewPnr, handleAddPnr, loading }) {
  return (
    <div className="add-pnr-container">
      <section className="add-pnr-section animate-fade-in">
        <h2 className="section-title">
          Check IRCTC PNR Status
        </h2>
        <p className="section-subtitle">
          Enter your 10-digit Indian Railways PNR number to check live status, chart status, coach position, and confirmation probability.
        </p>
        
        <form onSubmit={handleAddPnr} className="search-form glass">
          <div className="input-group">
            <Train className="input-icon" size={20} />
            <input 
              type="text" 
              placeholder="Enter 10-Digit PNR Number..." 
              value={newPnr}
              onChange={(e) => {
                // Ensure only digits are allowed
                const val = e.target.value.replace(/\D/g, '');
                setNewPnr(val);
              }}
              disabled={loading}
              maxLength={10}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || newPnr.length !== 10}
          >
            {loading ? <RefreshCw className="spin" size={18} /> : <Plus size={18} />}
            {loading ? 'Querying...' : 'Add PNR'}
          </button>
        </form>

      
      </section>
    </div>
  );
}
