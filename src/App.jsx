import React, { useState, useEffect } from 'react';
import logo from '../src/logo.png'; // Correct (Default Import)

import { 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Clipboard
} from 'lucide-react';

import { getSupabaseClient, hasAnySupabaseConfig } from './supabaseClient';
import { fetchPNRStatus } from './rapidapi';

// Subcomponents
import Navbar from './components/Navbar';
import AddPnrView from './components/AddPnrView';
import PnrListView from './components/PnrListView';

export default function App() {
  // Application State
  const [pnrList, setPnrList] = useState([]);
  const [newPnr, setNewPnr] = useState('');
  const [currentView, setCurrentView] = useState('add'); // 'add' or 'list'
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [refreshingPnr, setRefreshingPnr] = useState(null);
  const [selectedRawResponse, setSelectedRawResponse] = useState(null);
  const [toasts, setToasts] = useState([]);

  // DB client configuration check
  const [isDbConnected, setIsDbConnected] = useState(hasAnySupabaseConfig());

  // Toast notifier helper
  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Database Access Layer Wrapper
  const db = {
    list: async () => {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('pnr_records')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } else {
        const localData = localStorage.getItem('local_pnr_records') || '[]';
        return JSON.parse(localData);
      }
    },
    insert: async (record) => {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('pnr_records')
          .insert([record])
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const localData = JSON.parse(localStorage.getItem('local_pnr_records') || '[]');
        const newRecord = { 
          ...record, 
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        };
        localData.unshift(newRecord);
        localStorage.setItem('local_pnr_records', JSON.stringify(localData));
        return newRecord;
      }
    },
    update: async (pnr_no, updates) => {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('pnr_records')
          .update(updates)
          .eq('pnr_no', pnr_no)
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const localData = JSON.parse(localStorage.getItem('local_pnr_records') || '[]');
        const index = localData.findIndex(r => r.pnr_no === pnr_no);
        if (index !== -1) {
          const updatedRecord = { 
            ...localData[index], 
            ...updates, 
            updated_at: new Date().toISOString() 
          };
          localData[index] = updatedRecord;
          localStorage.setItem('local_pnr_records', JSON.stringify(localData));
          return updatedRecord;
        }
        throw new Error("Local PNR record not found");
      }
    },
    delete: async (pnr_no) => {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client
          .from('pnr_records')
          .delete()
          .eq('pnr_no', pnr_no);
        if (error) throw error;
      } else {
        let localData = JSON.parse(localStorage.getItem('local_pnr_records') || '[]');
        localData = localData.filter(r => r.pnr_no !== pnr_no);
        localStorage.setItem('local_pnr_records', JSON.stringify(localData));
      }
    }
  };

  // Load PNR records on load or DB change
  const loadPnrs = async () => {
    try {
      const records = await db.list();
      setPnrList(records);
    } catch (error) {
      console.error('Error fetching PNR list:', error);
      addToast(`Database fetch failed: ${error.message}. Table may not exist yet. Check setup guide.`, 'error');
    }
  };

  useEffect(() => {
    loadPnrs();
  }, [isDbConnected]);

  // Form Submission to query and add a new PNR
  const handleAddPnr = async (e) => {
    e.preventDefault();
    const cleanNum = newPnr.replace(/\D/g, '').trim();
    
    if (cleanNum.length !== 10) {
      addToast('Invalid PNR. A PNR must be exactly 10 digits.', 'error');
      return;
    }

    // Check duplicate
    if (pnrList.some(r => r.pnr_no === cleanNum)) {
      addToast(`PNR ${cleanNum} is already saved. Refreshing and opening list!`, 'info');
      setCurrentView('list');
      handleRefreshPnr(cleanNum);
      setNewPnr('');
      return;
    }

    setLoading(true);
    addToast(`Querying PNR ${cleanNum}...`, 'info');

    try {
      const normalizedData = await fetchPNRStatus(cleanNum, false);
      const inserted = await db.insert(normalizedData);
      
      setPnrList(prev => [inserted, ...prev]);
      setNewPnr('');
      addToast(`PNR ${cleanNum} added successfully!`, 'success');
      
      // Redirect to the list view to see the newly added card
      setCurrentView('list');
    } catch (err) {
      console.error(err);
      addToast(`Failed to query API: ${err.message || 'API Limit reached / Connection Error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Single record manual refresh action
  const handleRefreshPnr = async (pnrNo) => {
    setRefreshingPnr(pnrNo);
    addToast(`Refreshing status for PNR ${pnrNo}...`, 'info');

    try {
      const refreshedData = await fetchPNRStatus(pnrNo, false);
      const updated = await db.update(pnrNo, {
        train_no: refreshedData.train_no,
        train_name: refreshedData.train_name,
        date_of_journey: refreshedData.date_of_journey,
        from_station: refreshedData.from_station,
        to_station: refreshedData.to_station,
        class_code: refreshedData.class_code,
        passengers: refreshedData.passengers,
        last_status: refreshedData.last_status,
        raw_response: refreshedData.raw_response,
        updated_at: new Date().toISOString()
      });

      setPnrList(prev => prev.map(item => item.pnr_no === pnrNo ? updated : item));
      addToast(`PNR ${pnrNo} updated! Status: ${refreshedData.last_status}`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`Refresh failed: ${err.message}`, 'error');
    } finally {
      setRefreshingPnr(null);
    }
  };

  // Global Refresh All Records action
  const handleRefreshAll = async () => {
    if (pnrList.length === 0) return;
    addToast('Refreshing all saved PNR statuses...', 'info');
    
    // Refresh sequentially to stay friendly to API limits
    for (const record of pnrList) {
      await handleRefreshPnr(record.pnr_no);
    }
    addToast('All PNR records refreshed.', 'success');
  };

  // Deletion action
  const handleDeletePnr = async (pnrNo) => {
    if (!window.confirm(`Are you sure you want to delete PNR ${pnrNo}?`)) return;

    try {
      await db.delete(pnrNo);
      setPnrList(prev => prev.filter(r => r.pnr_no !== pnrNo));
      addToast(`PNR ${pnrNo} deleted.`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`Deletion failed: ${err.message}`, 'error');
    }
  };

  // Copy JSON Helper in Modal
  const handleCopyJson = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    addToast('Copied raw API response to clipboard!', 'info');
  };

  return (
    <div className="app-wrapper">
      {/* Header bar */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon"><img src={logo} alt="Sri Sathya Sai Sewa Organisation Punjab" /></span>
            <div>
              <h1>Sri Sathya Sai Sewa Organisation Punjab</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container">

        {/* Connection Mode Announcement Banner */}
        {!isDbConnected && (
          <div className="glass offline-banner">
            <AlertTriangle size={18} className="text-rac" style={{ flexShrink: 0 }} />
            <span>
              <strong>Offline DB Fallback:</strong> Running in local storage browser database.
            </span>
          </div>
        )}

        {/* View Switcher Navigation */}
        <Navbar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          pnrCount={pnrList.length} 
        />

        {/* Main Content Router */}
        <div className="view-content-wrapper">
          {currentView === 'add' ? (
            <AddPnrView 
              newPnr={newPnr}
              setNewPnr={setNewPnr}
              handleAddPnr={handleAddPnr}
              loading={loading}
            />
          ) : (
            <PnrListView 
              pnrList={pnrList}
              refreshingPnr={refreshingPnr}
              handleRefreshPnr={handleRefreshPnr}
              handleRefreshAll={handleRefreshAll}
              handleDeletePnr={handleDeletePnr}
              setSelectedRawResponse={setSelectedRawResponse}
              addToast={addToast}
            />
          )}
        </div>

        {/* Raw Response JSON Inspector Modal */}
        {selectedRawResponse && (
          <div className="modal-overlay" onClick={() => setSelectedRawResponse(null)}>
            <div className="glass modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Raw PNR JSON Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="action-icon-btn" onClick={() => handleCopyJson(selectedRawResponse)}>
                    <Clipboard size={16} />
                  </button>
                  <button className="close-btn" onClick={() => setSelectedRawResponse(null)}>&times;</button>
                </div>
              </div>
              <div className="modal-body">
                <pre>{JSON.stringify(selectedRawResponse, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Floating Notifications Toast elements */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'error' && <AlertTriangle size={16} />}
              {toast.type === 'info' && <Info size={16} />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
