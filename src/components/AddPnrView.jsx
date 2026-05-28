import React, { useState, useEffect } from 'react';
import { Train, Plus, RefreshCw, Info, ShieldCheck, RefreshCcw, MapPin, Edit, Trash2 } from 'lucide-react';
import { locationData } from '../utils/locationData';

export default function AddPnrView({ newPnr, setNewPnr, handleAddPnr, loading }) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  // Passenger details list
  const [passengerDetails, setPassengerDetails] = useState([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalName, setModalName] = useState('');
  const [modalAge, setModalAge] = useState('');
  const [modalGender, setModalGender] = useState('');
  const [modalSaiConnectId, setModalSaiConnectId] = useState('');

  // Reset dropdowns if parent resets the PNR field (e.g. after successful add)
  useEffect(() => {
    if (newPnr === '') {
      setSelectedState('');
      setSelectedDistrict('');
      setSelectedCity('');
      setPassengerDetails([]);
    }
  }, [newPnr]);

  // Derived lists
  const districts = selectedState ? Object.keys(locationData[selectedState] || {}) : [];
  const cities = (selectedState && selectedDistrict) ? (locationData[selectedState][selectedDistrict] || []) : [];

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedDistrict('');
    setSelectedCity('');
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedCity('');
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setModalName('');
    setModalAge('');
    setModalGender('');
    setModalSaiConnectId('');
    setIsModalOpen(true);
  };

  const openEditModal = (index) => {
    const p = passengerDetails[index];
    setEditingIndex(index);
    setModalName(p.name);
    setModalAge(p.age);
    setModalGender(p.gender);
    setModalSaiConnectId(p.saiConnectId);
    setIsModalOpen(true);
  };

  const handleRemovePassenger = (index) => {
    setPassengerDetails(passengerDetails.filter((_, i) => i !== index));
  };

  const handleSavePassenger = (e) => {
    e.preventDefault();
    if (!modalName.trim() || !modalAge || !modalGender || !modalSaiConnectId.trim()) return;

    const passengerData = {
      name: modalName.trim(),
      age: modalAge,
      gender: modalGender,
      saiConnectId: modalSaiConnectId.trim()
    };

    if (editingIndex === null) {
      setPassengerDetails([...passengerDetails, passengerData]);
    } else {
      const updated = [...passengerDetails];
      updated[editingIndex] = passengerData;
      setPassengerDetails(updated);
    }
    
    setIsModalOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAddPnr(e, selectedState, selectedDistrict, selectedCity, passengerDetails);
  };

  const isFormValid = 
    newPnr.length === 10 && 
    selectedState && 
    selectedDistrict && 
    selectedCity && 
    passengerDetails.length >= 1 &&
    !loading;

  return (
    <div className="add-pnr-container">
      <section className="add-pnr-section animate-fade-in">
        <h2 className="section-title">
          Check IRCTC PNR Status
        </h2>
        <p className="section-subtitle">
          Select passenger location metadata and enter the 10-digit PNR to track seat status and coach assignments.
        </p>
        
        <form onSubmit={handleSubmit} className="pnr-location-form glass">
          <div className="form-grid">
            
            {/* State Selection */}
            <div className="form-group">
              <label>Select State</label>
              <div className="select-wrapper">
                <MapPin className="select-icon" size={16} />
                <select 
                  value={selectedState} 
                  onChange={handleStateChange}
                  disabled={loading}
                  required
                >
                  <option value="">-- Choose State --</option>
                  {Object.keys(locationData).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* District Selection */}
            <div className="form-group">
              <label>Select District</label>
              <div className="select-wrapper">
                <MapPin className="select-icon" size={16} />
                <select 
                  value={selectedDistrict} 
                  onChange={handleDistrictChange}
                  disabled={loading || !selectedState}
                  required
                >
                  <option value="">-- Choose District --</option>
                  {districts.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City Selection */}
            <div className="form-group">
              <label>Select City</label>
              <div className="select-wrapper">
                <MapPin className="select-icon" size={16} />
                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={loading || !selectedDistrict}
                  required
                >
                  <option value="">-- Choose City --</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PNR Code */}
            <div className="form-group">
              <label>PNR Number</label>
              <div className="input-group">
                <Train className="input-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Enter 10-Digit PNR..." 
                  value={newPnr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewPnr(val);
                  }}
                  disabled={loading}
                  maxLength={10}
                  required
                />
              </div>
            </div>

          </div>

          {/* Passenger Details Section */}
          <div className="passenger-names-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="form-section-title" style={{ margin: 0 }}>Passenger Details</h3>
              {passengerDetails.length < 6 && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-add-passenger" 
                  onClick={openAddModal}
                  disabled={loading}
                  style={{ marginTop: 0 }}
                >
                  <Plus size={14} /> Add Passenger
                </button>
              )}
            </div>

            {/* List of Added Passengers */}
            {passengerDetails.length === 0 ? (
              <div className="empty-passengers-placeholder glass">
                <p>No passengers added yet. Please add at least 1 passenger's details.</p>
              </div>
            ) : (
              <div className="added-passengers-list">
                {passengerDetails.map((p, idx) => (
                  <div key={idx} className="passenger-list-item glass">
                    <div className="passenger-item-info">
                      <span className="passenger-item-sno">#{idx + 1}</span>
                      <div>
                        <strong className="passenger-item-name">{p.name}</strong>
                        <div className="passenger-item-meta">
                          <span>Age: {p.age}</span> • <span>Gender: {p.gender}</span> • <span>Sai Connect ID: {p.saiConnectId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="passenger-item-actions">
                      <button 
                        type="button" 
                        className="action-icon-btn" 
                        onClick={() => openEditModal(idx)}
                        disabled={loading}
                        title="Edit Passenger"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        type="button" 
                        className="action-icon-btn delete-btn" 
                        onClick={() => handleRemovePassenger(idx)}
                        disabled={loading}
                        title="Remove Passenger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary form-submit-btn" 
            disabled={!isFormValid}
          >
            {loading ? <RefreshCw className="spin" size={18} /> : <Plus size={18} />}
            {loading ? 'Adding PNR...' : 'Check & Add PNR'}
          </button>
        </form>

        {/* Onboarding info grid */}
        <div className="info-grid animate-fade-in-delayed">
          <div className="info-card glass">
            <div className="info-card-header">
              <ShieldCheck className="info-icon text-cnf" size={20} />
              <h3>Safe & Persistent</h3>
            </div>
            <p>
              Your PNR details are securely saved. We automatically use local storage or Supabase database to ensure you never lose your travel status updates.
            </p>
          </div>

          <div className="info-card glass">
            <div className="info-card-header">
              <RefreshCcw className="info-icon text-primary" size={20} />
              <h3>Dynamic Updates</h3>
            </div>
            <p>
              Check waitlist seat positions, train route endpoints, and coach configuration. You can refresh your tickets individually or all at once.
            </p>
          </div>

          <div className="info-card glass">
            <div className="info-card-header">
              <Info className="info-icon text-rac" size={20} />
              <h3>Confirmation Analysis</h3>
            </div>
            <p>
              Get intelligent predictions on the probability of waitlisted seats getting confirmed, customized directly to help plan your travel.
            </p>
          </div>
        </div>
      </section>

      {/* Modal Popup for adding/editing passenger details */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass modal-content passenger-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingIndex === null ? 'Add Passenger Details' : 'Edit Passenger Details'}</h3>
              <button className="close-btn" type="button" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSavePassenger}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label>Passenger Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter full name" 
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-grid" style={{ marginBottom: 0 }}>
                    <div className="form-group">
                      <label>Age</label>
                      <input 
                        type="number" 
                        placeholder="Age" 
                        value={modalAge}
                        onChange={(e) => setModalAge(e.target.value)}
                        min="1"
                        max="120"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        value={modalGender}
                        onChange={(e) => setModalGender(e.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Sai Connect ID</label>
                    <input 
                      type="text" 
                      placeholder="Enter Sai Connect ID" 
                      value={modalSaiConnectId}
                      onChange={(e) => setModalSaiConnectId(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Passenger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
