import React, { useState, useEffect } from 'react';
import { Train, Plus, RefreshCw, Info, ShieldCheck, RefreshCcw, MapPin } from 'lucide-react';
import { locationData } from '../utils/locationData';

export default function AddPnrView({ newPnr, setNewPnr, handleAddPnr, loading }) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Reset dropdowns if parent resets the PNR field (e.g. after successful add)
  useEffect(() => {
    if (newPnr === '') {
      setSelectedState('');
      setSelectedDistrict('');
      setSelectedCity('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAddPnr(e, selectedState, selectedDistrict, selectedCity);
  };

  const isFormValid = 
    newPnr.length === 10 && 
    selectedState && 
    selectedDistrict && 
    selectedCity && 
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
    </div>
  );
}
