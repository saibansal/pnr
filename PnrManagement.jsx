import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import Header from './Header'; // adjust path as needed

// Mapping of States -> Districts -> Cities (You can add more as needed)
const locationData = {
  "Punjab": {
    "Amritsar": ["Amritsar", "Ajnala", "Attari", "Beas", "Jandiala Guru", "Majitha", "Rayya"],
    "Barnala": ["Barnala", "Bhadaur", "Dhanaula", "Tapa"],
    "Bathinda": ["Bathinda", "Bhucho Mandi", "Goniana", "Maur", "Rampura Phul", "Talwandi Sabo"],
    "Faridkot": ["Faridkot", "Jaitu", "Kotkapura"],
    "Fatehgarh Sahib": ["Amloh", "Bassi Pathana", "Fatehgarh Sahib", "Khamanon", "Mandi Gobindgarh", "Sirhind"],
    "Fazilka": ["Abohar", "Fazilka", "Jalalabad"],
    "Ferozepur": ["Ferozepur", "Guru Har Sahai", "Makhu", "Zira"],
    "Gurdaspur": ["Batala", "Dhariwal", "Dinanagar", "Fatehgarh Churian", "Gurdaspur", "Qadian"],
    "Hoshiarpur": ["Dasuya", "Garhdiwala", "Garhshankar", "Hoshiarpur", "Mukerian", "Urmar Tanda"],
    "Jalandhar": ["Adampur", "Alawalpur", "Bhogpur", "Goraya", "Jalandhar", "Kartarpur", "Nakodar", "Nurmahal", "Phillaur", "Shahkot"],
    "Kapurthala": ["Bholath", "Kapurthala", "Phagwara", "Sultanpur Lodhi"],
    "Ludhiana": ["Doraha", "Jagraon", "Khanna", "Ludhiana", "Machhiwara", "Mullanpur Dakha", "Payal", "Raikot", "Sahnewal", "Samrala"],
    "Malerkotla": ["Ahmedgarh", "Amargarh", "Malerkotla"],
    "Mansa": ["Bareta", "Bhikhi", "Budhlada", "Mansa", "Sardulgarh"],
    "Moga": ["Badhni Kalan", "Baghapurana", "Dharamkot", "Kot Ise Khan", "Moga", "Nihal Singh Wala"],
    "Muktsar": ["Bariwala", "Gidderbaha", "Malout", "Muktsar"],
    "Pathankot": ["Pathankot", "Sujanpur"],
    "Patiala": ["Ghagga", "Ghanaur", "Nabha", "Patiala", "Patran", "Rajpura", "Samana", "Sanaur"],
    "Rupnagar": ["Anandpur Sahib", "Chamkaur Sahib", "Morinda", "Rupnagar (Ropar)"],
    "Mohali": ["Kharar", "Kurali", "Mohali", "Nayagaon", "Zirakpur"],
    "Sangrur": ["Bhawanigarh", "Dirba", "Khanauri", "Lehragaga", "Longowal", "Sangrur", "Sunam"],
    "Shaheed Bhagat Singh Nagar": ["Banga", "Nawanshahr", "Rahon"],
    "Tarn Taran": ["Bhikhiwind", "Khemkaran", "Patti", "Tarn Taran"]
  },
  "Delhi": { "New Delhi": ["New Delhi"], "North Delhi": ["North Delhi"], "South Delhi": ["South Delhi"] },
  "Maharashtra": { "Mumbai": ["Mumbai", "Navi Mumbai", "Thane"], "Pune": ["Pune", "Pimpri-Chinchwad"], "Nagpur": ["Nagpur"] }
};

const PnrManagement = () => {
  // 1. Form State
  const [formData, setFormData] = useState({
    pnr_no: '',
    samithi_name: '',
    state: '',
    district: '',
    city: '',
    zipcode: ''
  });
  const [editingId, setEditingId] = useState(null);

  // 2. PNR List State
  const [pnrList, setPnrList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Fetch immediately on mount
    fetchPnrs();

    // --- AUTOMATIC FEATURE 1: Supabase Realtime ---
    // Listens for any changes (INSERT, UPDATE, DELETE) on the 'pnrs' table.
    // If your backend or an external script updates a status, the UI updates instantly.
    const subscription = supabase
      .channel('pnrs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pnrs' },
        (payload) => {
          console.log('Realtime DB change received!', payload);
          fetchPnrs(); // Automatically refresh list on change
        }
      )
      .subscribe();

    // --- AUTOMATIC FEATURE 2: Background Polling ---
    // Automatically triggers the update check every 5 minutes (300,000 milliseconds)
    const updateInterval = setInterval(() => {
      handleGetUpdate(false); // Pass false so we don't spam the user with alerts in the background
    }, 300000);

    // Cleanup subscriptions and intervals on component unmount
    return () => {
      supabase.removeChannel(subscription);
      clearInterval(updateInterval);
    };
  }, []);

  const fetchPnrs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pnrs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching PNRs:', error);
    } else {
      setPnrList(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // Automatically reset city to blank if the state changes
      if (name === 'state') {
        newData.district = '';
        newData.city = '';
      }
      // Automatically reset city to blank if the district changes
      if (name === 'district') {
        newData.city = '';
      }
      return newData;
    });
  };

  // Add a new PNR to the Supabase database
  const handleAddPnr = async (e) => {
    e.preventDefault();
    const { pnr_no, samithi_name, state, district, city, zipcode } = formData;
    
    if (editingId) {
      // Update existing record
      const { error } = await supabase
        .from('pnrs')
        .update({ pnr_no, samithi_name, state, district, city, zipcode })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating PNR:', error);
        alert('Failed to update PNR.');
      } else {
        alert('PNR updated successfully!');
        setEditingId(null);
        setFormData({ pnr_no: '', samithi_name: '', state: '', district: '', city: '', zipcode: '' });
        fetchPnrs(); 
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('pnrs')
        .insert([{ pnr_no, samithi_name, state, district, city, zipcode, status: 'Pending' }]);

      if (error) {
        console.error('Error adding PNR:', error);
        alert('Failed to add PNR.');
      } else {
        alert('PNR added successfully!');
        // Reset the form
        setFormData({ pnr_no: '', samithi_name: '', state: '', district: '', city: '', zipcode: '' });
        fetchPnrs(); 
      }
    }
  };

  const handleEditClick = (pnr) => {
    setEditingId(pnr.id);
    setFormData({
      pnr_no: pnr.pnr_no || '',
      samithi_name: pnr.samithi_name || '',
      state: pnr.state || '',
      district: pnr.district || '',
      city: pnr.city || '',
      zipcode: pnr.zipcode || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ pnr_no: '', samithi_name: '', state: '', district: '', city: '', zipcode: '' });
  };

  const handleDeletePnr = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PNR?')) return;
    
    const { error } = await supabase
      .from('pnrs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting PNR:', error);
      alert('Failed to delete PNR.');
    } else {
      alert('PNR deleted successfully!');
      fetchPnrs();
    }
  };

  // The 'Get Update' handler (used manually by button AND automatically by interval)
  const handleGetUpdate = async (isManual = true) => {
    setUpdating(true);
    
    try {
      // Here you would hook up the actual API request to the Railway Service
      // Example: await checkExternalPnrStatus(pnrList);
      
      await fetchPnrs();
      
      // Only show the alert if the user explicitly clicked the button
      if (isManual) {
        alert('PNR statuses updated!');
      }
    } catch (error) {
      console.error('Error updating PNRs:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      {/* --- Header Navigation --- */}
      <Header />

      <div className="pnr-container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <h2>PNR Management</h2>

      {/* --- Add PNR Form Section --- */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>{editingId ? 'Edit PNR' : 'Add PNR no.'}</h3>
        <form onSubmit={handleAddPnr} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
          <input type="text" name="pnr_no" placeholder="PNR NO" value={formData.pnr_no} onChange={handleInputChange} required style={inputStyle} />
          <input type="text" name="samithi_name" placeholder="SAMITHI NAME" value={formData.samithi_name} onChange={handleInputChange} required style={inputStyle} />
          
          <select name="state" value={formData.state} onChange={handleInputChange} required style={inputStyle}>
            <option value="" disabled>Select State</option>
            {Object.keys(locationData).map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select name="district" value={formData.district} onChange={handleInputChange} required style={inputStyle} disabled={!formData.state}>
            <option value="" disabled>Select District</option>
            {formData.state && Object.keys(locationData[formData.state] || {}).map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <select name="city" value={formData.city} onChange={handleInputChange} required style={inputStyle} disabled={!formData.district}>
            <option value="" disabled>Select City</option>
            {formData.district && (locationData[formData.state]?.[formData.district] || []).map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <input type="text" name="zipcode" placeholder="ZIPCODE" value={formData.zipcode} onChange={handleInputChange} required style={inputStyle} />
          
          {editingId ? (
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ ...btnStyle, flex: 1, backgroundColor: '#007BFF', color: '#fff' }}>Update PNR</button>
              <button type="button" onClick={handleCancelEdit} style={{ ...btnStyle, flex: 1, backgroundColor: '#6c757d', color: '#fff' }}>Cancel</button>
            </div>
          ) : (
            <button type="submit" style={{ ...btnStyle, gridColumn: 'span 2', backgroundColor: '#007BFF', color: '#fff' }}>Add PNR</button>
          )}
        </form>
      </div>

      {/* --- List of PNRs Section --- */}
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>LIST OF PNR</h3>
          <button 
            onClick={() => handleGetUpdate(true)} 
            disabled={updating}
            style={{ ...btnStyle, backgroundColor: '#28A745', color: '#fff' }}
          >
            {updating ? 'Updating Statuses...' : 'Force Update Now'}
          </button>
        </div>

        {loading ? (
          <p>Loading PNRs...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#eaeaea' }}>
                <th style={thStyle}>PNR NO</th>
                <th style={thStyle}>Samithi Name</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>District</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>Zipcode</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pnrList.map((pnr) => (
                <tr key={pnr.id}>
                  <td style={tdStyle}>{pnr.pnr_no}</td>
                  <td style={tdStyle}>{pnr.samithi_name}</td>
                  <td style={tdStyle}>{pnr.state}</td>
                  <td style={tdStyle}>{pnr.district}</td>
                  <td style={tdStyle}>{pnr.city}</td>
                  <td style={tdStyle}>{pnr.zipcode}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: pnr.status === 'Confirmed' ? 'green' : 'orange' }}>
                    {pnr.status}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEditClick(pnr)} style={actionBtnStyle}>Edit</button>
                    <button onClick={() => handleDeletePnr(pnr.id)} style={{ ...actionBtnStyle, backgroundColor: '#dc3545' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {pnrList.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No PNRs have been added yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </div>
  );
};

// Basic inline styling
const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '4px' };
const btnStyle = { padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const thStyle = { borderBottom: '2px solid #ccc', padding: '12px 8px', textAlign: 'left' };
const tdStyle = { borderBottom: '1px solid #eee', padding: '12px 8px', textAlign: 'left' };
const actionBtnStyle = { padding: '6px 10px', marginRight: '5px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ffc107', color: '#000', fontSize: '12px', fontWeight: 'bold' };

export default PnrManagement;