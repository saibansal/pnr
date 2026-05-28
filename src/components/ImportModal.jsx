import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Check, 
  Trash2, 
  X, 
  RefreshCw, 
  MapPin 
} from 'lucide-react';
import { locationData } from '../utils/locationData';

// Dynamically load PDF.js script and set worker
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js parser engine.'));
    document.head.appendChild(script);
  });
};

export default function ImportModal({ isOpen, onClose, handleBulkImport, pnrList, setCurrentView }) {
  if (!isOpen) return null;

  // Import states
  const [importMode, setImportMode] = useState('file'); // 'file' or 'paste'
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [extractedPnrs, setExtractedPnrs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  // Global batch location selectors
  const [globalState, setGlobalState] = useState('');
  const [globalDistrict, setGlobalDistrict] = useState('');
  const [globalCity, setGlobalCity] = useState('');

  const fileInputRef = useRef(null);

  // File parsing helpers
  const parseCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    const pnrIndex = headers.indexOf('pnr number') !== -1 ? headers.indexOf('pnr number') : headers.indexOf('pnr_no');
    const stateIndex = headers.indexOf('state');
    const districtIndex = headers.indexOf('district');
    const cityIndex = headers.indexOf('city');

    const tasks = [];
    const startIdx = (pnrIndex !== -1 || stateIndex !== -1) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cleanCols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());

      let pnr = '';
      let state = '';
      let district = '';
      let city = '';

      if (pnrIndex !== -1 && cleanCols[pnrIndex]) {
        pnr = cleanCols[pnrIndex].replace(/\D/g, '');
      } else {
        const match = line.match(/\b\d{10}\b/);
        if (match) pnr = match[0];
      }

      if (pnr && pnr.length === 10) {
        if (stateIndex !== -1 && cleanCols[stateIndex]) state = cleanCols[stateIndex];
        if (districtIndex !== -1 && cleanCols[districtIndex]) district = cleanCols[districtIndex];
        if (cityIndex !== -1 && cleanCols[cityIndex]) city = cleanCols[cityIndex];
        
        // Match static location dataset hierarchy if present
        if (state && !locationData[state]) {
          state = '';
          district = '';
          city = '';
        } else if (state && district && !locationData[state][district]) {
          district = '';
          city = '';
        } else if (state && district && city && !locationData[state][district].includes(city)) {
          city = '';
        }

        if (!tasks.some(t => t.pnr_no === pnr)) {
          tasks.push({ pnr_no: pnr, state, district, city });
        }
      }
    }
    return tasks;
  };

  const parseUnstructuredText = (text) => {
    const matches = text.match(/\b\d{10}\b/g) || [];
    const uniqueMatches = [...new Set(matches)];
    return uniqueMatches.map(pnr => ({ pnr_no: pnr, state: '', district: '', city: '' }));
  };

  const handleProcessText = (text) => {
    if (!text.trim()) return;
    const tasks = parseUnstructuredText(text);
    if (tasks.length === 0) {
      alert('No 10-digit PNR numbers found in the pasted text.');
      return;
    }
    const untracked = tasks.filter(t => !pnrList.some(p => p.pnr_no === t.pnr_no));
    if (untracked.length === 0) {
      alert('All detected PNR numbers are already saved in your tracked list.');
      return;
    }
    setExtractedPnrs(untracked);
    setPasteText('');
    setGlobalState('');
    setGlobalDistrict('');
    setGlobalCity('');
    setShowPreview(true);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setIsReading(true);
    try {
      let tasks = [];
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (extension === 'csv') {
        const text = await file.text();
        tasks = parseCSV(text);
      } else if (extension === 'pdf') {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          text += strings.join(' ') + '\n';
        }
        tasks = parseUnstructuredText(text);
      } else {
        const text = await file.text();
        tasks = parseUnstructuredText(text);
      }

      const untracked = tasks.filter(t => !pnrList.some(p => p.pnr_no === t.pnr_no));
      if (untracked.length === 0) {
        alert('No new untracked PNR numbers were found in this file.');
        setIsReading(false);
        return;
      }

      setExtractedPnrs(untracked);
      setGlobalState('');
      setGlobalDistrict('');
      setGlobalCity('');
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert(`Error reading file: ${err.message}`);
    } finally {
      setIsReading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Row updates
  const updateRowState = (index, state) => {
    setExtractedPnrs(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, state, district: '', city: '' };
    }));
  };

  const updateRowDistrict = (index, district) => {
    setExtractedPnrs(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, district, city: '' };
    }));
  };

  const updateRowCity = (index, city) => {
    setExtractedPnrs(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, city };
    }));
  };

  const removeRow = (index) => {
    const updated = extractedPnrs.filter((_, idx) => idx !== index);
    setExtractedPnrs(updated);
    if (updated.length === 0) {
      setShowPreview(false);
    }
  };

  // Global batch updates
  const handleGlobalStateChange = (e) => {
    const stateVal = e.target.value;
    setGlobalState(stateVal);
    setGlobalDistrict('');
    setGlobalCity('');
    setExtractedPnrs(prev => prev.map(item => ({
      ...item,
      state: stateVal,
      district: '',
      city: ''
    })));
  };

  const handleGlobalDistrictChange = (e) => {
    const distVal = e.target.value;
    setGlobalDistrict(distVal);
    setGlobalCity('');
    setExtractedPnrs(prev => prev.map(item => ({
      ...item,
      district: distVal,
      city: ''
    })));
  };

  const handleGlobalCityChange = (e) => {
    const cityVal = e.target.value;
    setGlobalCity(cityVal);
    setExtractedPnrs(prev => prev.map(item => ({
      ...item,
      city: cityVal
    })));
  };

  const triggerImport = async () => {
    const invalidIndex = extractedPnrs.findIndex(t => !t.state || !t.district || !t.city);
    if (invalidIndex !== -1) {
      alert(`Please assign a State, District, and City for PNR ${extractedPnrs[invalidIndex].pnr_no} before importing.`);
      return;
    }

    setImportProgress({ current: 0, total: extractedPnrs.length, activePnr: '' });
    
    try {
      const results = await handleBulkImport(extractedPnrs, (current, total, activePnr) => {
        setImportProgress({ current, total, activePnr });
      });
      alert(`Import complete! Successfully imported ${results.importedCount} PNRs.${results.failedCount > 0 ? ` Failed: ${results.failedCount}.` : ''}`);
      setExtractedPnrs([]);
      setShowPreview(false);
      onClose();
      setCurrentView('list');
    } catch (err) {
      console.error(err);
      alert(`Import failed: ${err.message}`);
    } finally {
      setImportProgress(null);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setExtractedPnrs([]);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="glass modal-content modal-large">
        <div className="modal-header">
          <h3>
            {showPreview 
              ? `Configure Location Metadata (${extractedPnrs.length} PNRs)` 
              : 'Import PNRs in Bulk'}
          </h3>
          <button 
            className="close-btn" 
            onClick={() => {
              if (importProgress) return;
              onClose();
            }}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {importProgress ? (
            <div className="progress-overlay">
              <RefreshCw className="spin text-primary" size={36} />
              <h3>Importing and checking statuses...</h3>
              <p>Processing record {importProgress.current} of {importProgress.total}</p>
              {importProgress.activePnr && <p className="text-xs text-muted">Active: PNR {importProgress.activePnr}</p>}
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : showPreview ? (
            <>
              <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Each saved PNR requires location metadata. Apply a batch location below or specify them individually.
              </p>

              {/* Bulk Assign Controls */}
              <div className="bulk-location-editor">
                <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>Batch-Set Locations (Optional)</h4>
                <div className="bulk-location-grid">
                  <div className="bulk-location-field">
                    <label>State</label>
                    <select className="import-select" value={globalState} onChange={handleGlobalStateChange}>
                      <option value="">-- Apply State --</option>
                      {Object.keys(locationData).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bulk-location-field">
                    <label>District</label>
                    <select 
                      className="import-select" 
                      value={globalDistrict} 
                      onChange={handleGlobalDistrictChange}
                      disabled={!globalState}
                    >
                      <option value="">-- Apply District --</option>
                      {globalState && Object.keys(locationData[globalState] || {}).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bulk-location-field">
                    <label>City</label>
                    <select 
                      className="import-select" 
                      value={globalCity} 
                      onChange={handleGlobalCityChange}
                      disabled={!globalDistrict}
                    >
                      <option value="">-- Apply City --</option>
                      {globalState && globalDistrict && (locationData[globalState][globalDistrict] || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* List of PNRs */}
              <div className="import-preview-table-container">
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th>PNR Number</th>
                      <th>State</th>
                      <th>District</th>
                      <th>City</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedPnrs.map((item, index) => {
                      const stateList = Object.keys(locationData);
                      const districtList = item.state ? Object.keys(locationData[item.state] || {}) : [];
                      const cityList = (item.state && item.district) ? (locationData[item.state][item.district] || []) : [];

                      return (
                        <tr key={index}>
                          <td style={{ fontWeight: '600' }}>{item.pnr_no}</td>
                          <td>
                            <select 
                              className="import-select" 
                              value={item.state} 
                              onChange={(e) => updateRowState(index, e.target.value)}
                            >
                              <option value="">-- State --</option>
                              {stateList.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select 
                              className="import-select" 
                              value={item.district} 
                              onChange={(e) => updateRowDistrict(index, e.target.value)}
                              disabled={!item.state}
                            >
                              <option value="">-- District --</option>
                              {districtList.map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select 
                              className="import-select" 
                              value={item.city} 
                              onChange={(e) => updateRowCity(index, e.target.value)}
                              disabled={!item.district}
                            >
                              <option value="">-- City --</option>
                              {cityList.map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="action-icon-btn text-wl" 
                              onClick={() => removeRow(index)}
                              style={{ padding: '0.25rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  className="btn" 
                  onClick={handleCancelPreview}
                  style={{ background: 'rgba(15, 23, 42, 0.05)', color: 'var(--text-primary)' }}
                >
                  Back
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={triggerImport}
                >
                  <Check size={16} />
                  <span>Start Import</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted" style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Select files or paste ticket content. We will automatically search for and extract any 10-digit PNR numbers.
              </p>

              <div className="import-mode-tabs">
                <button 
                  className={`import-mode-tab ${importMode === 'file' ? 'active' : ''}`}
                  onClick={() => setImportMode('file')}
                >
                  <Upload size={16} />
                  <span>Upload Document</span>
                </button>
                <button 
                  className={`import-mode-tab ${importMode === 'paste' ? 'active' : ''}`}
                  onClick={() => setImportMode('paste')}
                >
                  <FileText size={16} />
                  <span>Paste Text</span>
                </button>
              </div>

              {importMode === 'file' ? (
                <div 
                  className={`import-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }}
                    accept=".csv,.txt,.pdf"
                    onChange={(e) => handleFile(e.target.files[0])}
                    disabled={isReading}
                  />
                  {isReading ? (
                    <>
                      <RefreshCw size={36} className="spin text-primary" />
                      <p>Processing and extracting PNRs from file...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={36} className="text-muted" />
                      <p><strong>Click to upload</strong> or drag and drop a file</p>
                      <p className="text-xs text-muted">Supports CSV, PDF tickets, and plain text files</p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea 
                    className="import-paste-area"
                    placeholder="Paste ticket details, SMS texts, or raw log containing 10-digit PNR numbers here..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleProcessText(pasteText)}
                    disabled={!pasteText.trim()}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Extract PNRs
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
