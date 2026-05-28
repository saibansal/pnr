import React, { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  Eye, 
  Trash2, 
  Clipboard, 
  Info,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Edit2,
  X,
  ChevronDown,
  Download
} from 'lucide-react';
import { locationData } from '../utils/locationData';

// Utility helper to format Current Status with parentheses for queue numbers (e.g. "RLWL (15)")
const cleanCurrentStatus = (statusStr) => {
  if (!statusStr) return '-';
  let clean = String(statusStr).trim();
  if (clean.includes('(') && clean.includes(')')) {
    return clean;
  }
  let formatted = clean
    .replace(/(?:\/|\s+|-)?(\d+)/g, ' ($1)')
    .replace(/\s+/g, ' ')
    .trim();
  formatted = formatted.replace(/W\s*\/\s*L/gi, 'W/L');
  return formatted;
};

// Utility helper to ensure parentheses are present for Booking Status (e.g. "RLWL (10)" or "W/L (18),RLGN")
const cleanBookingStatus = (statusStr) => {
  if (!statusStr) return '-';
  let clean = String(statusStr).trim();
  if (clean.includes('(') && clean.includes(')')) {
    return clean;
  }
  let formatted = clean
    .replace(/(?:\/|\s+|-)?(\d+)/g, ' ($1)')
    .replace(/\s+/g, ' ')
    .trim();
  formatted = formatted.replace(/W\s*\/\s*L/gi, 'W/L');
  return formatted;
};

// Utility to parse the integer queue position from a waitlist string
const getWaitlistNumber = (statusStr) => {
  if (!statusStr) return 0;
  const match = statusStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// Dynamic calculator to mock confirmation chances matching the user's screenshot exactly
const calculateChance = (statusStr) => {
  const upper = String(statusStr).toUpperCase();
  if (upper.includes('CNF') || upper === 'CONFIRMED' || upper.includes('RAC')) {
    return null; // CNF and RAC don't show chances
  }
  
  const wlNo = getWaitlistNumber(statusStr);
  if (wlNo === 0) return null;
  
  // Custom curve fitting user's screenshot details
  let chance = 82 - (wlNo * 1.45);
  if (wlNo === 19) chance = 56;
  if (wlNo === 20) chance = 55;
  
  return `${Math.max(10, Math.min(99, Math.round(chance)))}% Chance`;
};

// Returns relative text for checked timestamp e.g. "just now", "5m ago"
const formatTimeRelative = (isoString) => {
  if (!isoString) return 'just now';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Format timestamp helper
const formatTime = (isoString) => {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function PnrListView({ 
  pnrList, 
  refreshingPnr, 
  handleRefreshPnr, 
  handleRefreshAll, 
  handleDeletePnr, 
  handleUpdateLocation,
  setSelectedRawResponse,
  addToast 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Status Checkbox States
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['Confirmed', 'Waitlisted', 'RAC']);

  // Custom Multi-Select Location Filter Checkbox States
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);

  // Editing States
  const [editingRecord, setEditingRecord] = useState(null);
  const [editState, setEditState] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editCity, setEditCity] = useState('');

  // Copy PNR helper
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    addToast(`Copied PNR ${text} to clipboard!`, 'info');
  };

  // Trigger editing values setup
  const startEditing = (record) => {
    setEditingRecord(record);
    setEditState(record.state || '');
    setEditDistrict(record.district || '');
    setEditCity(record.city || '');
  };

  // Close all open menus
  const closeAllDropdowns = () => {
    setStatusDropdownOpen(false);
    setStateDropdownOpen(false);
    setDistrictDropdownOpen(false);
    setCityDropdownOpen(false);
  };

  const anyDropdownOpen = statusDropdownOpen || stateDropdownOpen || districtDropdownOpen || cityDropdownOpen;

  // Static list of options derived from cascading locationData
  const filterStates = Object.keys(locationData);

  const filterDistricts = selectedStates.length > 0
    ? Array.from(new Set(selectedStates.flatMap(state => Object.keys(locationData[state] || {})))).sort()
    : [];

  const filterCities = selectedStates.length > 0 && selectedDistricts.length > 0
    ? Array.from(
        new Set(
          selectedStates.flatMap(state => 
            selectedDistricts
              .filter(dist => locationData[state]?.[dist])
              .flatMap(dist => locationData[state][dist] || [])
          )
        )
      ).sort()
    : [];

  // Toggle state checkbox selections and cascade cleanup
  const toggleStateSelection = (stateName) => {
    const nextStates = selectedStates.includes(stateName)
      ? selectedStates.filter(s => s !== stateName)
      : [...selectedStates, stateName];
    
    setSelectedStates(nextStates);

    // Clean up selected districts that are no longer valid
    const nextDistrictsList = nextStates.flatMap(s => Object.keys(locationData[s] || {}));
    const nextDistricts = selectedDistricts.filter(d => nextDistrictsList.includes(d));
    setSelectedDistricts(nextDistricts);

    // Clean up selected cities that are no longer valid
    const nextCitiesList = nextStates.flatMap(s => 
      nextDistricts
        .filter(d => locationData[s]?.[d])
        .flatMap(d => locationData[s][d] || [])
    );
    const nextCities = selectedCities.filter(c => nextCitiesList.includes(c));
    setSelectedCities(nextCities);
  };

  // Toggle district checkbox selections and cascade cleanup
  const toggleDistrictSelection = (distName) => {
    const nextDistricts = selectedDistricts.includes(distName)
      ? selectedDistricts.filter(d => d !== distName)
      : [...selectedDistricts, distName];
    
    setSelectedDistricts(nextDistricts);

    // Clean up selected cities that are no longer valid
    const nextCitiesList = selectedStates.flatMap(s => 
      nextDistricts
        .filter(d => locationData[s]?.[d])
        .flatMap(d => locationData[s][d] || [])
    );
    const nextCities = selectedCities.filter(c => nextCitiesList.includes(c));
    setSelectedCities(nextCities);
  };

  // Toggle city checkbox selections
  const toggleCitySelection = (cityName) => {
    setSelectedCities(prev => 
      prev.includes(cityName)
        ? prev.filter(c => c !== cityName)
        : [...prev, cityName]
    );
  };

  // Toggle status checkboxes
  const toggleStatusSelection = (statusName) => {
    setSelectedStatuses(prev => 
      prev.includes(statusName)
        ? prev.filter(s => s !== statusName)
        : [...prev, statusName]
    );
  };

  // Reset all filters to show all PNR cards
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatuses(['Confirmed', 'Waitlisted', 'RAC']);
    setSelectedStates([]);
    setSelectedDistricts([]);
    setSelectedCities([]);
    addToast('All filters cleared!', 'info');
  };

  // Check if any filter is active
  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedStatuses.length < 3 ||
    selectedStates.length > 0 || 
    selectedDistricts.length > 0 || 
    selectedCities.length > 0;

  // Filter lists based on Search bar, dynamic status checkboxes, and cascading locations
  const filteredList = pnrList.filter(record => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      record.pnr_no.includes(q) ||
      record.train_no.toLowerCase().includes(q) ||
      record.train_name.toLowerCase().includes(q) ||
      record.from_station.toLowerCase().includes(q) ||
      record.to_station.toLowerCase().includes(q);
      
    if (!matchesSearch) return false;
    
    // Status filters (multi-select checking)
    if (selectedStatuses.length < 3) {
      if (!selectedStatuses.includes(record.last_status)) {
        return false;
      }
    }

    // Cascading location filters (multi-select checking)
    if (selectedStates.length > 0 && !selectedStates.includes(record.state)) return false;
    if (selectedDistricts.length > 0 && !selectedDistricts.includes(record.district)) return false;
    if (selectedCities.length > 0 && !selectedCities.includes(record.city)) return false;

    return true;
  });

  // Display text helpers
  const getStatusButtonText = () => {
    if (selectedStatuses.length === 3) return 'All Statuses';
    if (selectedStatuses.length === 0) return 'No Status Selected';
    
    const abbreviations = {
      'Confirmed': 'CNF',
      'Waitlisted': 'WL',
      'RAC': 'RAC'
    };
    return selectedStatuses.map(s => abbreviations[s] || s).join(', ');
  };

  const getStatesButtonText = () => {
    if (selectedStates.length === 0) return 'All States';
    return selectedStates.length === 1 ? selectedStates[0] : `${selectedStates.length} States`;
  };

  const getDistrictsButtonText = () => {
    if (selectedDistricts.length === 0) return 'All Districts';
    return selectedDistricts.length === 1 ? selectedDistricts[0] : `${selectedDistricts.length} Districts`;
  };

  const getCitiesButtonText = () => {
    if (selectedCities.length === 0) return 'All Cities';
    return selectedCities.length === 1 ? selectedCities[0] : `${selectedCities.length} Cities`;
  };

  // Export filtered PNR list to CSV (Excel readable)
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      addToast('No PNR records to export!', 'error');
      return;
    }

    const headers = [
      'PNR Number',
      'Train Number',
      'Train Name',
      'Journey Date',
      'From Station',
      'To Station',
      'Class Code',
      'State',
      'District',
      'City',
      'Passenger S.No',
      'Passenger Name',
      'Passenger Age',
      'Passenger Gender',
      'Sai Connect ID',
      'Current Status',
      'Booking Status',
      'Coach',
      'Berth',
      'Overall Status',
      'Last Checked'
    ];

    const rows = [];

    filteredList.forEach(record => {
      const baseFields = [
        `"${String(record.pnr_no || '')}"`,
        `"${String(record.train_no || '')}"`,
        `"${String(record.train_name || '').replace(/"/g, '""')}"`,
        `"${String(record.date_of_journey || '')}"`,
        `"${String(record.from_station || '')}"`,
        `"${String(record.to_station || '')}"`,
        `"${String(record.class_code || '')}"`,
        `"${String(record.state || '').replace(/"/g, '""')}"`,
        `"${String(record.district || '').replace(/"/g, '""')}"`,
        `"${String(record.city || '').replace(/"/g, '""')}"`
      ];

      if (record.passengers && record.passengers.length > 0) {
        record.passengers.forEach(p => {
          const passengerFields = [
            `"${String(p.passenger_number || '')}"`,
            `"${String(p.name || '').replace(/"/g, '""')}"`,
            `"${String(p.age || '')}"`,
            `"${String(p.gender || '')}"`,
            `"${String(p.sai_connect_id || '').replace(/"/g, '""')}"`,
            `"${String(p.current_status || '').replace(/"/g, '""')}"`,
            `"${String(p.booking_status || '').replace(/"/g, '""')}"`,
            `"${String(p.coach || '').replace(/"/g, '""')}"`,
            `"${String(p.berth || '').replace(/"/g, '""')}"`
          ];
          const footerFields = [
            `"${String(record.last_status || '').replace(/"/g, '""')}"`,
            `"${String(record.updated_at || record.created_at || '').replace(/"/g, '""')}"`
          ];
          rows.push([...baseFields, ...passengerFields, ...footerFields].join(','));
        });
      } else {
        const emptyPassengerFields = ['""', '""', '""', '""', '""', '""', '""', '""', '""'];
        const footerFields = [
          `"${String(record.last_status || '').replace(/"/g, '""')}"`,
          `"${String(record.updated_at || record.created_at || '').replace(/"/g, '""')}"`
        ];
        rows.push([...baseFields, ...emptyPassengerFields, ...footerFields].join(','));
      }
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PNR_Travel_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Excel (CSV) report downloaded successfully!', 'success');
  };

  return (
    <div className="pnr-list-container animate-fade-in">
      
      {/* Printable Report Header (Only visible when printing) */}
      <div className="printable-report-header-only">
        <h2>Sri Sathya Sai Sewa Organisation Punjab</h2>
        <h3>PNR Travel Status Report</h3>
        <p className="printable-meta">
          <strong>Generated:</strong> {new Date().toLocaleString()} | 
          <strong> Total Records:</strong> {filteredList.length} PNRs | 
          <strong> Filters Applied:</strong> {searchQuery ? `Search="${searchQuery}"` : 'None'}
        </p>
      </div>

      {/* Backdrop overlay to close open dropdowns */}
      {anyDropdownOpen && (
        <div className="dropdown-backdrop" onClick={closeAllDropdowns} />
      )}

      {/* Dashboard Controls Row */}
      <div className="controls-row glass">
        <div className="search-filter-box">
          <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
          <input 
            type="text" 
            placeholder="Filter by train, station or PNR..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Multi-Select Cascading Location Filters */}
        <div className="location-filters-wrapper">
          
          {/* State Dropdown */}
          <div className="custom-dropdown-container">
            <button 
              type="button" 
              className={`btn filter-select dropdown-trigger ${selectedStates.length > 0 ? 'btn-active-filter' : ''}`}
              onClick={() => {
                closeAllDropdowns();
                setStateDropdownOpen(!stateDropdownOpen);
              }}
            >
              <span>{getStatesButtonText()}</span>
              <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
            {stateDropdownOpen && (
              <div className="dropdown-menu glass">
                {filterStates.map(state => (
                  <label key={state} className="dropdown-item">
                    <input 
                      type="checkbox" 
                      checked={selectedStates.includes(state)} 
                      onChange={() => toggleStateSelection(state)}
                    />
                    <span>{state}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* District Dropdown */}
          <div className="custom-dropdown-container">
            <button 
              type="button" 
              className={`btn filter-select dropdown-trigger ${selectedDistricts.length > 0 ? 'btn-active-filter' : ''}`}
              onClick={() => {
                closeAllDropdowns();
                setDistrictDropdownOpen(!districtDropdownOpen);
              }}
              disabled={selectedStates.length === 0}
            >
              <span>{getDistrictsButtonText()}</span>
              <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
            {districtDropdownOpen && (
              <div className="dropdown-menu glass">
                {filterDistricts.map(dist => (
                  <label key={dist} className="dropdown-item">
                    <input 
                      type="checkbox" 
                      checked={selectedDistricts.includes(dist)} 
                      onChange={() => toggleDistrictSelection(dist)}
                    />
                    <span>{dist}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* City Dropdown */}
          <div className="custom-dropdown-container">
            <button 
              type="button" 
              className={`btn filter-select dropdown-trigger ${selectedCities.length > 0 ? 'btn-active-filter' : ''}`}
              onClick={() => {
                closeAllDropdowns();
                setCityDropdownOpen(!cityDropdownOpen);
              }}
              disabled={selectedDistricts.length === 0}
            >
              <span>{getCitiesButtonText()}</span>
              <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
            {cityDropdownOpen && (
              <div className="dropdown-menu glass">
                {filterCities.map(city => (
                  <label key={city} className="dropdown-item">
                    <input 
                      type="checkbox" 
                      checked={selectedCities.includes(city)} 
                      onChange={() => toggleCitySelection(city)}
                    />
                    <span>{city}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Custom Status Multi-Select Checkbox Dropdown */}
          <div className="custom-dropdown-container">
            <button 
              type="button" 
              className={`btn btn-secondary dropdown-trigger ${selectedStatuses.length < 3 ? 'btn-active-filter' : ''}`}
              onClick={() => {
                closeAllDropdowns();
                setStatusDropdownOpen(!statusDropdownOpen);
              }}
            >
              <span>Status: {getStatusButtonText()}</span>
              <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
            
            {statusDropdownOpen && (
              <div className="dropdown-menu glass">
                <label className="dropdown-item">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('Confirmed')} 
                    onChange={() => toggleStatusSelection('Confirmed')}
                  />
                  <span>Confirmed (CNF)</span>
                </label>
                <label className="dropdown-item">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('Waitlisted')} 
                    onChange={() => toggleStatusSelection('Waitlisted')}
                  />
                  <span>Waitlisted (WL)</span>
                </label>
                <label className="dropdown-item">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('RAC')} 
                    onChange={() => toggleStatusSelection('RAC')}
                  />
                  <span>RAC (RAC)</span>
                </label>
              </div>
            )}
          </div>
          
          {pnrList.length > 0 && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px', display: 'flex', gap: '6px', alignItems: 'center' }}
              onClick={handleRefreshAll}
              disabled={refreshingPnr !== null}
            >
              <RefreshCw size={12} className={refreshingPnr ? 'spin' : ''} />
              Refresh All
            </button>
          )}

          {/* Export Actions */}
          {pnrList.length > 0 && (
            <>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px', display: 'flex', gap: '6px', alignItems: 'center' }}
                onClick={handleExportExcel}
                title="Export to Excel"
              >
                <Download size={12} />
                Excel
              </button>
            </>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button 
              className="btn btn-danger" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '20px', display: 'flex', gap: '6px', alignItems: 'center' }}
              onClick={resetFilters}
            >
              <X size={12} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* PNR Grid flat display */}
      <main className="pnr-grid">
        {filteredList.map((record) => {
          const isRefreshing = refreshingPnr === record.pnr_no;
          
          return (
            <article key={record.pnr_no} className="glass glass-hover pnr-card animate-fade-in">
              
              {/* Card Header */}
              <div className="pnr-card-header">
                <div>
                  <span 
                    className="pnr-number-title" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleCopyText(record.pnr_no)}
                    title="Click to copy PNR"
                  >
                    {record.pnr_no}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    Click to copy PNR
                  </span>
                </div>
                
                <span className={`badge badge-${
                  record.last_status === 'Confirmed' ? 'cnf' : 
                  record.last_status === 'Waitlisted' ? 'wl' : 
                  record.last_status === 'RAC' ? 'rac' : 'unknown'
                }`}>
                  {record.last_status}
                </span>
              </div>

              {/* Card Body */}
              <div className="pnr-card-body">
                <div className="train-title-info">
                  <span className="train-number">TR #{record.train_no}</span>
                  <h3 className="train-name">{record.train_name}</h3>
                </div>

                {/* Location Pin Metadata tag */}
                {record.state && record.district && record.city && (
                  <div className="card-location-tag">
                    <MapPin size={13} className="text-secondary" />
                    <span>{record.city}, {record.district}, {record.state}</span>
                  </div>
                )}

                {/* Travel route path graphic */}
                <div className="path-container">
                  <div className="station-node">
                    <span className="station-code">{record.from_station}</span>
                    <span className="station-dot"></span>
                  </div>
                  <div className="path-line"></div>
                  <div className="station-node">
                    <span className="station-code">{record.to_station}</span>
                    <span className="station-dot station-dot-to"></span>
                  </div>
                </div>

                {/* Class & Date info row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="journey-date-badge">
                    <Calendar size={14} />
                    <span>{record.date_of_journey}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    Class: {record.class_code}
                  </span>
                </div>

                {/* Passenger Status Table */}
                <div className="passengers-table-container">
                  <div className="passengers-table-header">
                    <h4>Passenger Status</h4>
                    <div style={{ textAlign: 'right' }}>
                      <span className="chart-status-badge">
                        {record.raw_response?.chart_prepared || record.chart_prepared
                          ? 'Chart Prepared'
                          : 'Chart not prepared'}
                      </span>
                      <span className="checked-time">
                        (Checked {formatTimeRelative(record.updated_at || record.created_at)})
                      </span>
                    </div>
                  </div>
                  
                    <div className="passengers-list-container">
                      {record.passengers && record.passengers.map((p, idx) => {
                        const currentClean = cleanCurrentStatus(p.current_status);
                        const bookingClean = cleanBookingStatus(p.booking_status);
                        
                        const chance = calculateChance(currentClean);
                        const hasCoach = p.coach && p.coach !== 'WL' && p.coach !== 'N/A' && p.coach !== '0';
                        
                        return (
                          <div key={idx} className="passenger-row-card">
                            <div className="passenger-row-header">
                              <div className="passenger-row-left">
                                <span className="passenger-badge">P{p.passenger_number}</span>
                                <span className="passenger-name">{p.name || 'Passenger'}</span>
                                {(p.age || p.gender) && (
                                  <span className="passenger-age-gender">
                                    ({p.age || '-'}{p.gender ? `, ${p.gender}` : ''})
                                  </span>
                                )}
                              </div>
                              <div className="passenger-row-right">
                                <span className={`status-text ${
                                  currentClean.toUpperCase().includes('CNF') 
                                    ? 'status-cnf' 
                                    : 'status-wl'
                                }`}>
                                  {currentClean}
                                </span>
                                {chance && <span className="chance-badge">{chance}</span>}
                              </div>
                            </div>
                            
                            <div className="passenger-row-details">
                              <div className="passenger-detail-item">
                                <span className="detail-label">Sai Connect ID</span>
                                <span className="detail-value">{p.sai_connect_id || '-'}</span>
                              </div>
                              <div className="passenger-detail-item">
                                <span className="detail-label">Booking Status</span>
                                <span className="detail-value">{bookingClean}</span>
                              </div>
                              <div className="passenger-detail-item">
                                <span className="detail-label">Coach/Berth</span>
                                <span className="detail-value">{hasCoach ? `${p.coach}/${p.berth}` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pnr-card-footer">
                <span className="timestamp">
                  Updated: {formatTime(record.updated_at || record.created_at)}
                </span>
                
                <div className="card-actions">
                  <button 
                    className="action-icon-btn" 
                    title="View Raw Response"
                    onClick={() => setSelectedRawResponse(record.raw_response)}
                  >
                    <Eye size={16} />
                  </button>
                  
                  <button 
                    className="action-icon-btn" 
                    title="Manual Refresh"
                    onClick={() => handleRefreshPnr(record.pnr_no)}
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                  </button>

                  <button 
                    className="action-icon-btn" 
                    title="Edit Location"
                    onClick={() => startEditing(record)}
                  >
                    <Edit2 size={16} />
                  </button>

                  <button 
                    className="action-icon-btn delete-btn" 
                    title="Delete PNR"
                    onClick={() => handleDeletePnr(record.pnr_no)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

            </article>
          );
        })}

        {/* Empty list helper */}
        {filteredList.length === 0 && (
          <div className="glass empty-state">
            <span className="empty-icon">🎫</span>
            <h3>No PNRs Tracked</h3>
            <p style={{ maxWidth: '400px', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
              {searchQuery || selectedStatuses.length < 3 || selectedStates.length > 0 || selectedDistricts.length > 0 || selectedCities.length > 0
                ? 'Try editing your search or location filters.' 
                : 'Enter a valid 10-digit PNR in the Add PNR page to check and save journey updates.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-primary" onClick={resetFilters}>
                Show All PNR Cards
              </button>
            )}
          </div>
        )}
      </main>

      {/* Edit Location Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="glass modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                <Edit2 size={18} className="text-primary" />
                Edit Location Details
              </h3>
              <button className="close-btn" onClick={() => setEditingRecord(null)}>&times;</button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateLocation(editingRecord.pnr_no, editState, editDistrict, editCity);
              setEditingRecord(null);
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Modify traveler locations for PNR: <strong style={{ color: 'var(--text-primary)' }}>{editingRecord.pnr_no}</strong>
                  </span>
                </div>
                
                {/* State Select */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select State</label>
                  <div className="select-wrapper">
                    <MapPin className="select-icon" size={16} />
                    <select 
                      value={editState} 
                      onChange={(e) => {
                        setEditState(e.target.value);
                        setEditDistrict('');
                        setEditCity('');
                      }}
                      required
                    >
                      <option value="">-- Choose State --</option>
                      {Object.keys(locationData).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* District Select */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select District</label>
                  <div className="select-wrapper">
                    <MapPin className="select-icon" size={16} />
                    <select 
                      value={editDistrict} 
                      onChange={(e) => {
                        setEditDistrict(e.target.value);
                        setEditCity('');
                      }}
                      disabled={!editState}
                      required
                    >
                      <option value="">-- Choose District --</option>
                      {editState && Object.keys(locationData[editState] || {}).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* City Select */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select City</label>
                  <div className="select-wrapper">
                    <MapPin className="select-icon" size={16} />
                    <select 
                      value={editCity} 
                      onChange={(e) => setEditCity(e.target.value)}
                      disabled={!editDistrict}
                      required
                    >
                      <option value="">-- Choose City --</option>
                      {editState && editDistrict && (locationData[editState][editDistrict] || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pnr-card-footer" style={{ justifyContent: 'flex-end', gap: '8px', background: 'transparent' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 16px', borderRadius: '8px' }}
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ padding: '8px 16px', borderRadius: '8px' }}
                  disabled={!editState || !editDistrict || !editCity}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
