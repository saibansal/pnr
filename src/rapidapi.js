import axios from 'axios';

// Get default keys from environment
const defaultApiKey = import.meta.env.VITE_RAPIDAPI_KEY || '59b23fac1bmsh2e843ade6011a85p1dae8cjsnb04da9169382';
const defaultApiHost = import.meta.env.VITE_RAPIDAPI_HOST || 'irctc-indian-railway-pnr-status.p.rapidapi.com';

// Format status with waitlist queue number (e.g. RLWL (15))
const formatStatusWithNo = (status, no) => {
  if (!status) return 'Unknown';
  
  let cleanStatus = String(status).trim();
  const upperStatus = cleanStatus.toUpperCase();
  
  if (upperStatus === 'CNF' || upperStatus === 'CONFIRMED') {
    return 'CNF';
  }
  
  // If the status already contains parentheses, leave as-is
  if (cleanStatus.includes('(') && cleanStatus.includes(')')) {
    return cleanStatus;
  }
  
  // Find any digits and wrap them in parentheses, e.g.:
  // "W/L 18,RLGN" -> "W/L (18),RLGN"
  // "RLWL/10" -> "RLWL (10)"
  // "WL 15" -> "WL (15)"
  let formatted = cleanStatus
    .replace(/(?:\/|\s+|-)?(\d+)/g, ' ($1)')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean up potential space split in "W / L" or "W /L" back to "W/L"
  formatted = formatted.replace(/W\s*\/\s*L/gi, 'W/L');
  
  // Case 2: Separate status and number fields are returned
  if (no && String(no).trim() && !/\d/.test(cleanStatus)) {
    const cleanNo = String(no).trim();
    if (cleanNo !== '0' && cleanNo !== 'N/A') {
      return `${formatted} (${cleanNo})`;
    }
  }
  
  return formatted;
};

// Extract station code from string or object (e.g. {code: "SBC", name: "Bengaluru"})
const extractStationCode = (val) => {
  if (!val) return 'Unknown';
  if (typeof val === 'object') {
    return val.code || val.stationCode || val.station_code || val.name || val.stationName || 'Unknown';
  }
  return String(val);
};

// Extract class code from string or object
const extractClassCode = (val) => {
  if (!val) return 'Unknown';
  if (typeof val === 'object') {
    return val.code || val.classCode || val.class_code || val.name || 'Unknown';
  }
  return String(val);
};

// Extract journey date from string or object
const extractDate = (val) => {
  if (!val) return 'Unknown';
  if (typeof val === 'object') {
    return val.date || val.journeyDate || val.journey_date || val.formatted || 'Unknown';
  }
  return String(val);
};

// Mock Generator for testing when API limits are reached, or offline
export const generateMockPNR = (pnrNumber) => {
  const sum = pnrNumber.split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  const isEven = sum % 2 === 0;
  
  const mockTrains = [
    { no: '12951', name: 'MUMBAI RAJDHANI', from: 'MMCT', to: 'NDLS', time: '16:35' },
    { no: '12002', name: 'NDLS SHATABDI EXP', from: 'NDLS', to: 'HBJ', time: '06:00' },
    { no: '12626', name: 'KERALA EXPRESS', from: 'NDLS', to: 'TVC', time: '20:10' },
    { no: '22692', name: 'SBC RAJDHANI', from: 'NZM', to: 'SBC', time: '19:50' },
  ];
  
  const train = mockTrains[sum % mockTrains.length];
  
  // Dates: add index days to today
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + (sum % 10) + 1);
  const journeyDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

  // Passengers list
  const passengerCount = (sum % 3) + 1;
  const passengers = [];
  
  for (let i = 1; i <= passengerCount; i++) {
    const isConfirmed = isEven || (i === 1 && sum % 3 === 0);
    const bookingStatus = isConfirmed ? 'CNF' : `WL/${10 + i * 2}`;
    
    // On first load, status is waitlist, let refresh confirm it
    const currentStatus = isConfirmed ? 'CNF' : `WL/${5 + i}`;
    
    passengers.push({
      passenger_number: i,
      booking_status: bookingStatus,
      current_status: currentStatus,
      coach: isConfirmed ? `A${1 + (sum % 3)}` : 'WL',
      berth: isConfirmed ? String(12 + i * 4) : '0'
    });
  }

  return {
    pnr_number: pnrNumber,
    train_number: train.no,
    train_name: train.name,
    from_station: train.from,
    to_station: train.to,
    boarding_point: train.from,
    reservation_upto: train.to,
    journey_date: journeyDate,
    class_code: isEven ? '3A' : 'SL',
    status: isEven ? 'Confirmed' : 'Waitlisted',
    passengers: passengers,
    raw_response: {
      source: 'Mock Simulator',
      generated_at: new Date().toISOString(),
      pnr: pnrNumber,
      trainInfo: train,
      passengerDetails: passengers
    }
  };
};

// Fetch PNR status
export const fetchPNRStatus = async (pnrNumber, useMock = false) => {
  if (useMock) {
    // Delay slightly to simulate network speed
    await new Promise((resolve) => setTimeout(resolve, 800));
    return normalizePNRResponse(generateMockPNR(pnrNumber), pnrNumber);
  }

  // Get dynamic override keys if saved in local storage (optional developer feature)
  const apiKey = localStorage.getItem('override_rapidapi_key') || defaultApiKey;
  const apiHost = localStorage.getItem('override_rapidapi_host') || defaultApiHost;

  const options = {
    method: 'GET',
    url: `https://${apiHost}/getPNRStatus/${pnrNumber}`,
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await axios.request(options);
    console.log('RapidAPI Response:', response.data);
    return normalizePNRResponse(response.data, pnrNumber);
  } catch (error) {
    console.error('RapidAPI Fetch Error:', error);
    throw error;
  }
};

// Normalize API responses to shield the app from slight schema variations
const normalizePNRResponse = (data, pnrNumber) => {
  // If API returned a wrapped response inside a status or data key
  const root = data.data || data;

  const pnr = root.pnr_number || root.pnrNumber || root.pnr || pnrNumber;
  const trainNo = root.train_number || root.trainNo || root.trainNumber || root.train_no || 'Unknown';
  const trainName = root.train_name || root.trainName || root.train_name || 'Unknown Train';
  
  // Safe extraction for station details (supporting objects and fallback property names)
  const fromStationVal = root.from_station || root.fromStation || root.from_station_code || root.fromStationCode || root.from || root.boarding_point || root.boardingPoint || root.source || 'Unknown';
  const toStationVal = root.to_station || root.toStation || root.to_station_code || root.toStationCode || root.to || root.reservation_upto || root.reservationUpto || root.destination || 'Unknown';
  const fromStation = extractStationCode(fromStationVal);
  const toStation = extractStationCode(toStationVal);

  // Safe extraction for journey dates
  const journeyDateVal = root.journey_date || root.journeyDate || root.date_of_journey || root.dateOfJourney || root.date || root.travel_date || root.travelDate || 'Unknown';
  const journeyDate = extractDate(journeyDateVal);

  // Safe extraction for journey classes
  const classCodeVal = root.class_code || root.classCode || root.class || root.journey_class || root.journeyClass || 'Unknown';
  const classCode = extractClassCode(classCodeVal);
  
  // Extract and normalize passengers list
  let rawPassengers = root.passengers || root.passenger_details || root.passengerList || [];
  if (!Array.isArray(rawPassengers) && typeof rawPassengers === 'object') {
    rawPassengers = Object.values(rawPassengers);
  }
  
  if (rawPassengers.length > 0) {
    console.log('Raw Passenger 1 Data:', rawPassengers[0]);
  }

  const passengers = rawPassengers.map((p, index) => {
    const bStatus = p.bookingStatusDetails || p.booking_status || p.bookingStatus || p.booking_status_current || 'Unknown';
    const cStatus = p.currentStatusDetails || p.current_status || p.currentStatus || p.current_status_current || 'Unknown';
    
    // Check separate index/queue number properties in typical API responses
    const bNo = p.booking_status_no || p.bookingStatusNo || p.booking_status_number || p.bookingStatusNumber || 
                p.booking_index || p.bookingIndex || p.booking_no || p.bookingNo || 
                p.booking_number || p.bookingNumber || p.booking_position || p.bookingPosition || 
                p.booking_status_position || p.bookingStatusPosition || p.wl || p.wl_no || p.wlNo || p.wlNumber || '';
                
    const cNo = p.current_status_no || p.currentStatusNo || p.current_status_number || p.currentStatusNumber || 
                p.current_index || p.currentIndex || p.current_no || p.currentNo || 
                p.current_number || p.currentNumber || p.current_position || p.currentPosition || 
                p.current_status_position || p.currentStatusPosition || p.current_wl || p.currentWl || 
                p.current_wl_no || p.currentWlNo || p.current_wl_number || p.currentWlNumber || '';

    return {
      passenger_number: p.passenger_number || p.passengerNo || p.passengerNumber || (index + 1),
      booking_status: formatStatusWithNo(bStatus, bNo),
      current_status: formatStatusWithNo(cStatus, cNo),
      coach: p.coach || p.coach_position || p.coachNo || p.currentCoachId || 'N/A',
      berth: p.berth || p.berth_no || p.seat_number || p.seatNo || p.currentBerthNo || 'N/A'
    };
  });

  // Determine overall status
  let overallStatus = 'Unknown';
  if (passengers.length > 0) {
    const allCnf = passengers.every(p => 
      p.current_status.toUpperCase().includes('CNF') || 
      p.current_status.toUpperCase() === 'CONFIRMED'
    );
    if (allCnf) {
      overallStatus = 'Confirmed';
    } else if (passengers.some(p => p.current_status.toUpperCase().includes('WL'))) {
      overallStatus = 'Waitlisted';
    } else if (passengers.some(p => p.current_status.toUpperCase().includes('RAC'))) {
      overallStatus = 'RAC';
    } else {
      overallStatus = passengers[0].current_status;
    }
  }

  return {
    pnr_no: pnr,
    train_no: trainNo,
    train_name: trainName,
    date_of_journey: journeyDate,
    from_station: fromStation,
    to_station: toStation,
    class_code: classCode,
    passengers: passengers,
    last_status: overallStatus,
    raw_response: data
  };
};
