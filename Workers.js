// Cloudflare Worker for TRMNL Flight Tracker (Radar/TCAS Edition)
// Source: Airplanes.live (No API Key)
// Features: Radar Math, Vector Tails, Custom Airline Map

// --- CONFIGURATION ---
// You can override these in Cloudflare Settings -> Variables
const DEFAULT_CONFIG = {
  LAT: "28.5562", // Default: New Delhi
  LON: "77.1000",
  RADIUS_NM: "15"
};

// --- 1. AIRLINE DATABASE (Complete List) ---
// --- 1. AIRLINE DATABASE (Global Coverage) ---
const AIRLINE_MAP = {
  // --- NORTH AMERICA (MAJORS) ---
  AAL: "American", UAL: "United", DAL: "Delta", ACA: "Air Canada",
  SWA: "Southwest", JBU: "JetBlue", ASA: "Alaska", NKS: "Spirit",
  FFT: "Frontier", WJA: "WestJet", TSC: "Air Transat", AMX: "Aeromexico",
  VOI: "Volaris", HAL: "Hawaiian", ALO: "Allegiant",
  
  // --- NORTH AMERICA (REGIONALS/FEEDERS) ---
  SKW: "SkyWest", RPA: "Republic", JIA: "PSA Airlines", ENY: "Envoy",
  EDV: "Endeavor", ASH: "Mesa", QXE: "Horizon", GJS: "GoJet",
  CPZ: "Compass", PDT: "Piedmont", JAZ: "Jazz Aviation",

  // --- SOUTH AMERICA & CARIBBEAN ---
  TAM: "LATAM", LAN: "LATAM", LPE: "LATAM Peru", LXP: "LATAM",
  AVA: "Avianca", GLO: "Gol", AZU: "Azul", ARG: "Aerolineas Argentinas",
  CMP: "Copa", SKX: "Sky Airline", JAT: "JetSMART", 
  
  // --- EUROPE (MAJORS) ---
  BAW: "British Airways", DLH: "Lufthansa", AFR: "Air France", KLM: "KLM",
  IBE: "Iberia", AZA: "ITA Airways", SWR: "Swiss", AUA: "Austrian",
  SAS: "SAS", FIN: "Finnair", EIN: "Aer Lingus", TAP: "TAP Portugal",
  LOT: "LOT Polish", THY: "Turkish Airlines", AFL: "Aeroflot",
  ICE: "Icelandair", NAX: "Norwegian", VIR: "Virgin Atlantic",

  // --- EUROPE (LOW COST / LEISURE) ---
  RYR: "Ryanair", EZY: "easyJet", EJU: "easyJet Europe", WZZ: "Wizz Air",
  WMT: "Wizz Air Malta", TVF: "Transavia", VLG: "Vueling",
  EWG: "Eurowings", EXS: "Jet2", TUI: "TUI Fly", TOM: "TUI UK",
  CFG: "Condor", EDW: "Edelweiss", NSS: "Norwegian Shuttle",

  // --- MIDDLE EAST ---
  UAE: "Emirates", QTR: "Qatar Airways", ETD: "Etihad",
  SVA: "Saudia", GFA: "Gulf Air", KAC: "Kuwait Airways",
  OMA: "Oman Air", RJA: "Royal Jordanian", MEA: "Middle East Air",
  FDB: "flydubai", ABY: "Air Arabia", JZR: "Jazeera",
  ELY: "El Al", MSR: "EgyptAir", IAW: "Iraqi Airways",

  // --- ASIA (CHINA/EAST ASIA) ---
  CCA: "Air China", CSN: "China Southern", CES: "China Eastern",
  CHH: "Hainan", CSC: "Sichuan", CXA: "Xiamen", CQN: "Chongqing",
  CPA: "Cathay Pacific", HDA: "Cathay Dragon", CRK: "Hong Kong Air",
  JAL: "Japan Airlines", ANA: "All Nippon", APJ: "Peach",
  KAL: "Korean Air", AAR: "Asiana", JNA: "Jin Air",
  EVA: "EVA Air", CAL: "China Airlines",

  // --- ASIA (SE/SOUTH/CENTRAL) ---
  SIA: "Singapore Airlines", MAS: "Malaysia Airlines", GIA: "Garuda",
  THA: "Thai Airways", HVN: "Vietnam Airlines", VJC: "VietJet",
  AIC: "Air India", IGO: "IndiGo", VTI: "Vistara", SEJ: "SpiceJet",
  AXB: "Air India Express", AKY: "Akasa", IAD: "AIX Connect",
  ALK: "SriLankan", BBC: "Biman", PIA: "Pakistan Int",
  KZR: "Air Astana", UZB: "Uzbekistan Air", AXM: "AirAsia",

  // --- OCEANIA ---
  QFA: "Qantas", QLK: "QantasLink", ANZ: "Air New Zealand",
  VOZ: "Virgin Australia", JST: "Jetstar", RXA: "Rex",
  FJI: "Fiji Airways", NGU: "Niugini",

  // --- AFRICA ---
  ETH: "Ethiopian", SAA: "South African", RAM: "Royal Air Maroc",
  KQA: "Kenya Airways", DAH: "Air Algerie", RWD: "RwandAir",
  LNI: "Lion Air", TUN: "Tunisair",

  // --- CARGO & LOGISTICS ---
  FDX: "FedEx", UPS: "UPS", GTI: "Atlas Air", CLX: "Cargolux",
  BOX: "AeroLogic", KHK: "Kitty Hawk", CKS: "Kalitta",
  PAC: "Polar Air", BCS: "DHL", DHK: "DHL",
  QJE: "Quikjet", BDG: "Blue Dart",

  // --- BUSINESS JETS (NETJETS/VISTA/ETC) ---
  EJA: "NetJets", NJE: "NetJets Europe", VJT: "VistaJet",
  LXJ: "Flexjet", GAC: "GlobeAir", AZE: "Arcus Air",
  XRO: "Exxr", ADN: "Danish Air",

  // --- MILITARY / GOVERNMENT ---
  RCH: "US Air Force", CNV: "US Navy", RRR: "Royal Air Force",
  CFC: "Canadian Forces", ASY: "Royal Australian AF",
  IAM: "Italian Air Force", GAF: "German Air Force",
  AME: "Spanish Air Force", COTAM: "French Air Force",
  PAT: "US Army", UAF: "UAE Air Force"
};

function getAirline(callsign) {
  if (!callsign || callsign.length < 3) return null;
  return AIRLINE_MAP[callsign.substring(0, 3).toUpperCase()] || null;
}

// --- MATH HELPERS ---
function toRad(deg) { return deg * (Math.PI / 180); }

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 0.539957; 
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// --- COLLISION LOGIC ---
function resolveLabels(flights) {
  // Screen is roughly 800x480. 
  // We work in % (0-100).
  // A label is approx 15% wide and 10% tall.
  const LABEL_W = 18; 
  const LABEL_H = 12;
  const occupied = []; // Stores {x, y, w, h} of placed labels

  // Candidate offsets (dx, dy) in % relative to plane center
  const candidates = [
    { dx: 3, dy: 3 },   // 1. Bottom-Right (Preferred)
    { dx: -20, dy: -15 }, // 2. Top-Left
    { dx: 3, dy: -15 },   // 3. Top-Right
    { dx: -20, dy: 3 }    // 4. Bottom-Left
  ];

  return flights.map(f => {
    let bestPos = candidates[0];
    
    // Try to find a spot that doesn't overlap
    for (let pos of candidates) {
      const labelRect = {
        x: f.tcas_x + pos.dx,
        y: f.tcas_y + pos.dy,
        w: LABEL_W,
        h: LABEL_H
      };

      // Check collision with all previously placed labels
      let collision = false;
      for (let occ of occupied) {
        if (labelRect.x < occ.x + occ.w &&
            labelRect.x + labelRect.w > occ.x &&
            labelRect.y < occ.y + occ.h &&
            labelRect.y + labelRect.h > occ.y) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        bestPos = pos;
        break; 
      }
    }

    // Register this position as occupied
    occupied.push({
      x: f.tcas_x + bestPos.dx,
      y: f.tcas_y + bestPos.dy,
      w: LABEL_W,
      h: LABEL_H
    });

    // We scale these offsets up for pixels in Liquid (800x480 screen)
    // 1% X ~= 8px, 1% Y ~= 4.8px
    f.label_dx = Math.round(bestPos.dx * 8);
    f.label_dy = Math.round(bestPos.dy * 4.8);
    
    return f;
  });
}

// === MAIN WORKER ===
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat') || env.LATITUDE || DEFAULT_CONFIG.LAT);
    const lon = parseFloat(url.searchParams.get('lon') || env.LONGITUDE || DEFAULT_CONFIG.LON);
    const radiusNm = parseFloat(url.searchParams.get('radius_nm') || env.RADIUS_NM || DEFAULT_CONFIG.RADIUS_NM);

    const apiUrl = `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`;
    
    try {
      const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'TRMNL-Worker/1.0' } });
      if (!resp.ok) return new Response(`API Error: ${resp.status}`, { status: 500 });

      const data = await resp.json();
      const acList = data.ac || [];

      let flights = [];
      for (const ac of acList) {
        const latitude = ac.lat ?? ac.lastPosition?.lat;
        const longitude = ac.lon ?? ac.lastPosition?.lon;
        if (!latitude || !longitude || ac.alt_baro === "ground") continue;

        const distanceNm = calculateDistance(lat, lon, latitude, longitude);
        if (distanceNm > radiusNm) continue;

        const bearing = calculateBearing(lat, lon, latitude, longitude);
        
        // Radar Math (0-100 scale)
        const relDist = distanceNm / radiusNm; 
        const angleRad = toRad(bearing);
        let tcas_x = 50 + (Math.sin(angleRad) * relDist * 50);
        let tcas_y = 50 - (Math.cos(angleRad) * relDist * 50);
        
        // Vector Math
        let speed = ac.gs || 0;
        let vectorLength = 12 + ((speed / 500) * 18); 
        if (vectorLength > 30) vectorLength = 30;

        flights.push({
          callsign: (ac.flight || ac.hex || "UNKNOWN").trim().toUpperCase(),
          airline: getAirline((ac.flight || "").trim()),
          aircraftType: ac.t || "UNK",          // e.g. "A320"
  description: ac.desc || ac.t || "",   // e.g. "AIRBUS A-320"

          distance: Math.round(distanceNm * 10) / 10,
          altitude: typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro) : 0,
          speed: Math.round(speed),
          heading: ac.track ? Math.round(ac.track) : 0,
          is_climbing: (ac.baro_rate > 500),
          is_descending: (ac.baro_rate < -500),
          is_proximate: (distanceNm < 6),
          tcas_x: parseFloat(tcas_x.toFixed(1)),
          tcas_y: parseFloat(tcas_y.toFixed(1)),
          vector_length: Math.round(vectorLength)
        });
      }

      // Sort by distance and limit BEFORE resolving labels
      flights.sort((a, b) => a.distance - b.distance);
      const topFlights = flights.slice(0, 15);

      // Apply Collision Detection
      const resolvedFlights = resolveLabels(topFlights);

      return new Response(JSON.stringify({
        merge_variables: {
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }),
          aircraft_count: flights.length,
          flights: resolvedFlights,
          location: { lat, lon, radius_nm: radiusNm }
        }
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
