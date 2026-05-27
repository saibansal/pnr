import { useState } from 'react';
import './App.css';

function App() {
  const [pnrInput, setPnrInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Note: There's no open public API for live Indian Railway PNR status without authentication/subscription.
  // This function simulates the API fetch. Replace the mock implementation below with a real API call 
  // (e.g., to RapidAPI Indian Railway APIs) once you have an API Key.
  const fetchPnrStatus = async (pnr) => {
    return new Promise((resolve) => {
      // Simulating network delay
      setTimeout(() => {
        const mockStatuses = ['CNF', 'RAC', 'WL/45', 'WL/12'];
        resolve({
          pnr,
          status: mockStatuses[Math.floor(Math.random() * mockStatuses.length)],
          trainName: 'Express ' + (10000 + Math.floor(Math.random() * 90000)),
          boardingStation: 'NDLS',
          destinationStation: 'BCT',
          date: new Date().toLocaleDateString(),
          success: true
        });
      }, 1000 + Math.random() * 1500);
    });
  };

  const handleRefresh = async () => {
    if (!pnrInput.trim()) return;

    setLoading(true);
    // Split by comma, space, or newline, remove empty strings, and trim
    const pnrArray = pnrInput
      .split(/[\n, ]+/)
      .map((p) => p.trim())
      .filter((p) => p !== '' && /^\d+$/.test(p)); // ensures it's a number

    if (pnrArray.length === 0) {
      alert("Please enter valid numeric PNR numbers.");
      setLoading(false);
      return;
    }

    try {
      // Fetch all PNRs simultaneously using Promise.all
      const statuses = await Promise.all(pnrArray.map((pnr) => fetchPnrStatus(pnr)));
      setResults(statuses);
    } catch (error) {
      console.error("Error fetching PNR statuses:", error);
      alert("Failed to fetch PNR status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Railway PNR Status Tracker</h1>
        <p>Check multiple PNRs at once</p>
      </header>

      <div className="input-section">
        <label htmlFor="pnr-input">Enter PNR Numbers (comma-separated or one per line):</label>
        <textarea
          id="pnr-input"
          value={pnrInput}
          onChange={(e) => setPnrInput(e.target.value)}
          placeholder="e.g. 1234567890, 0987654321"
          rows={5}
        />
        <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Fetching Statuses...' : 'Check / Refresh Status'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <h2>Latest Status</h2>
          <div className="grid">
            {results.map((result, index) => (
              <div key={index} className="card">
                <div className="card-header">
                  <h3>PNR: {result.pnr}</h3>
                  <span className={`status-badge ${result.status === 'CNF' ? 'success' : 'warning'}`}>
                    {result.status}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Train:</strong> {result.trainName}</p>
                  <p><strong>Route:</strong> {result.boardingStation} → {result.destinationStation}</p>
                  <p><strong>Journey Date:</strong> {result.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
