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
import ImportModal from './components/ImportModal';

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
  const [showImportModal, setShowImportModal] = useState(false);

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
  const handleAddPnr = async (e, stateVal, districtVal, cityVal, passengerDetails = []) => {
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
      
      // Map passenger details to passengers array
      let finalPassengers = (normalizedData.passengers || []).map((p, idx) => {
        const details = passengerDetails[idx] || {};
        return {
          ...p,
          name: details.name || '',
          age: details.age || '',
          gender: details.gender || '',
          sai_connect_id: details.saiConnectId || ''
        };
      });

      // If API returned empty passenger details, fallback/create from details
      if (finalPassengers.length === 0 && passengerDetails.length > 0) {
        finalPassengers = passengerDetails.map((details, idx) => ({
          passenger_number: idx + 1,
          booking_status: 'Unchecked',
          current_status: 'Unchecked',
          coach: 'N/A',
          berth: 'N/A',
          name: details.name || '',
          age: details.age || '',
          gender: details.gender || '',
          sai_connect_id: details.saiConnectId || ''
        }));
      }

      const recordToInsert = {
        ...normalizedData,
        passengers: finalPassengers,
        state: stateVal,
        district: districtVal,
        city: cityVal
      };
      const inserted = await db.insert(recordToInsert);
      
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

  // Bulk import PNRs sequentially
  const handleBulkImport = async (pnrTasks, onProgress) => {
    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pnrTasks.length; i++) {
      const task = pnrTasks[i];
      const cleanNum = task.pnr_no.replace(/\D/g, '').trim();

      if (cleanNum.length !== 10) {
        failedCount++;
        continue;
      }

      // Check duplicate
      if (pnrList.some(r => r.pnr_no === cleanNum)) {
        continue;
      }

      if (onProgress) {
        onProgress(i + 1, pnrTasks.length, cleanNum);
      }

      let recordToInsert;
      try {
        const normalizedData = await fetchPNRStatus(cleanNum, false);
        recordToInsert = {
          ...normalizedData,
          state: task.state || '',
          district: task.district || '',
          city: task.city || ''
        };
      } catch (err) {
        console.error(`Bulk import query failed for ${cleanNum}:`, err);
        // Fallback to placeholder record so it's not lost
        recordToInsert = {
          pnr_no: cleanNum,
          train_no: 'N/A',
          train_name: 'Unchecked PNR',
          date_of_journey: 'N/A',
          from_station: 'N/A',
          to_station: 'N/A',
          class_code: 'N/A',
          passengers: [],
          last_status: 'Unchecked',
          raw_response: { error: err.message || 'API Limit / Connection Error' },
          state: task.state || '',
          district: task.district || '',
          city: task.city || ''
        };
      }

      try {
        const inserted = await db.insert(recordToInsert);
        setPnrList(prev => [inserted, ...prev]);
        importedCount++;
      } catch (dbErr) {
        console.error(`Database insertion failed for PNR ${cleanNum}:`, dbErr);
        failedCount++;
      }
    }

    return { importedCount, failedCount };
  };

  // Single record manual refresh action
  const handleRefreshPnr = async (pnrNo) => {
    setRefreshingPnr(pnrNo);
    addToast(`Refreshing status for PNR ${pnrNo}...`, 'info');

    try {
      const refreshedData = await fetchPNRStatus(pnrNo, false);

      // Preserve existing passenger details
      const existingRecord = pnrList.find(r => r.pnr_no === pnrNo);
      const existingPassengers = existingRecord ? (existingRecord.passengers || []) : [];

      const mergedPassengers = refreshedData.passengers.map((p, idx) => {
        const existingP = existingPassengers.find(ep => ep.passenger_number === p.passenger_number) || existingPassengers[idx];
        return {
          ...p,
          name: existingP ? (existingP.name || '') : '',
          age: existingP ? (existingP.age || '') : '',
          gender: existingP ? (existingP.gender || '') : '',
          sai_connect_id: existingP ? (existingP.sai_connect_id || '') : ''
        };
      });

      const updated = await db.update(pnrNo, {
        train_no: refreshedData.train_no,
        train_name: refreshedData.train_name,
        date_of_journey: refreshedData.date_of_journey,
        from_station: refreshedData.from_station,
        to_station: refreshedData.to_station,
        class_code: refreshedData.class_code,
        passengers: mergedPassengers,
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

  // Edit location metadata action
  const handleUpdateLocation = async (pnrNo, newState, newDistrict, newCity) => {
    try {
      const updated = await db.update(pnrNo, {
        state: newState,
        district: newDistrict,
        city: newCity,
        updated_at: new Date().toISOString()
      });
      setPnrList(prev => prev.map(item => item.pnr_no === pnrNo ? updated : item));
      addToast(`Updated location for PNR ${pnrNo}!`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`Update failed: ${err.message}`, 'error');
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
          onImportClick={() => setShowImportModal(true)}
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
              handleUpdateLocation={handleUpdateLocation}
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

        {/* Import Modal Popup */}
        <ImportModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          handleBulkImport={handleBulkImport}
          pnrList={pnrList}
          setCurrentView={setCurrentView}
        />

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
