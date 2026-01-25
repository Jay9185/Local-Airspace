# 📡 Approach Control: TRMNL Flight Radar 

![IMG_3536](https://github.com/user-attachments/assets/71823bcb-5c6a-43a9-a6a0-aca124eca6c9)




> **Turn your TRMNL e-ink display into a professional Air Traffic Control radar scope.**

**Approach Control** is a high-fidelity plugin for the [TRMNL](https://usetrmnl.com/) e-ink display. Unlike standard flight trackers that simply list data in rows, this project renders a **Plan Position Indicator (PPI)**—the circular radar scope used by Air Traffic Controllers.

It performs real-time geometry calculations to plot aircraft positions relative to your exact home location, visualizes heading vectors, indicates vertical trends, and applies smart collision-avoidance logic to keep the display readable.

## ☕️ Support the Project

The **Plan Position Indiactor** open-source and free to use. If you found the code useful, you can fuel my flight training here: 

<div align="center">

<a href="https://buymeacoffee.com/turbulencegains" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217">
</a>

</div>


---

## ✨ Features

*   **Real-Time Geometry:** Converts GPS coordinates into a relative X/Y grid centered on your home.
*   **Vector Tails:** Visualizes ground speed. Longer lines indicate faster aircraft (jets), shorter lines indicate slower aircraft (props).
*   **Smart Labeling:** A custom collision algorithm prevents text tags from overlapping, ensuring 100% readability.
*   **TCAS Symbology:**
    *   **■ Solid Square:** Proximate traffic (within 6 NM).
    *   **◇ Hollow Diamond:** Distant traffic.
*   **Vertical Trends:** Arrows (↑/↓) indicate if an aircraft is climbing or descending.
*   **Zero-Config API:** Uses the **Airplanes.live** community feed (No API Key required).
*   **E-Ink Optimized:**
    *   High-contrast B&W layout.
    *   2px thick lines for sharp rendering.
    *   "Anti-bleed" margins to prevent text from cutting off at screen edges.

---

## 📋 Prerequisites

1.  A **TRMNL** E-Ink Display.
2.  A free **Cloudflare** account (to host the backend logic).
3.  Your exact **Latitude & Longitude** (Instructions below).

---

## 🚀 Installation Guide

### Phase 1: The Backend (Cloudflare Worker)

The "Brain" of the radar. It runs the math and fetches data.

1.  **Create the Worker:**
    *   Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
    *   Go to **Compute (Workers)** → **Create Application** → **Create Worker**.
    *   Name it: `trmnl-approach-control`.
    *   Click **Deploy**.

2.  **Add the Code:**
    *   Click **Edit Code**.
    *   Delete the default "Hello World" code (everything in `worker.js`).
    *   Copy and paste the **Radar Worker Code** (from this repository).

3.  **📍 IMPORTANT: Configure Your Location:**
    *   Look at the very top of the code (Lines 4-10).
    *   Find the `DEFAULT_CONFIG` block.
    *   **Edit these values directly in the code:**
    
    ```javascript
    const DEFAULT_CONFIG = {
      LAT: "40.6413",     // REPLACE with your Latitude
      LON: "-73.7781",    // REPLACE with your Longitude
      RADIUS_NM: "25"     // Range in Nautical Miles (15-40 recommended)
    };
    ```

    > **How to find your coordinates:** Open Google Maps, right-click on your house. The first number is Latitude, the second is Longitude.

4.  **Save:**
    *   Click **Deploy** (Top Right) to save your changes.
    *   Copy the **Worker URL** (e.g., `https://trmnl-approach-control.yourname.workers.dev`).

---

### Phase 2: The Frontend (TRMNL Plugin)

The "Face" of the radar. It renders the rings, blips, and vectors.

1.  **Create Plugin:**
    *   Log in to [TRMNL](https://usetrmnl.com/).
    *   Go to **Plugins** → **Private Plugins** → **Add New**.
    *   **Name:** `Approach Control`

2.  **Link to Backend:**
    *   **Strategy:** Select `Polling`.
    *   **Schedule:** Select the fastest option available for your plan:
        *   **Standard Plan:** `Every 15 minutes`
        *   **TRMNL+ Plan:** `Every 5 minutes`
    *   **Webhook URL:** Paste the Cloudflare Worker URL you copied earlier.

3.  **Add the Visuals:**
    *   **Markup:** Copy and paste the contents of `Trmnl markup`.
    *   *(Note: The CSS is included inside the Markup file).*

4.  **Save & Test:**
    *   Click **Save**.
    *   Check the dashboard preview. If you see "SCANNING..." or aircraft blips, you are live!

---

## ⚙️ Customization

Since the configuration is hardcoded, **all changes happen in the Cloudflare Worker code.**

### 1. Adjusting Radar Range
If your screen is too empty (rural area) or too cluttered (near a major hub):
1.  Open the Worker Code.
2.  Change `RADIUS_NM: "25"` to a different number.
    *   **10-15:** Good for seeing airport approaches.
    *   **40-50:** Good for seeing high-altitude flyovers.
3.  Click **Deploy**. The rings on your TRMNL will update automatically on the next refresh.

### 2. Changing Timezone
The timestamp at the bottom right defaults to `Asia/Kolkata`.
1.  Scroll to the bottom of the Worker Code.
2.  Find: `timeZone: "Asia/Kolkata"`.
3.  Change it to your local string (e.g., `America/New_York`, `Europe/London`, `Australia/Sydney`).
4.  Click **Deploy**.

### 3. Adding Airlines
The worker includes a database of major airlines. If you see `UNKNOWN` frequently:
1.  Find the `const AIRLINE_MAP` section in the code.
2.  Add your local carrier using its 3-letter ICAO code:
    ```javascript
    "QFA": "Qantas",
    "JST": "Jetstar",
    "XYZ": "My Local Charter", // Add yours here
    ```

---

## 📐 Technical details (How it works)

For the curious, here is how we translate GPS data to a 480px screen:

1.  **Haversine Formula:** Used to calculate the precise distance between your home (`LAT`/`LON`) and the aircraft.
2.  **Bearing Calculation:** Determines the angle (0-360°) of the aircraft relative to you.
3.  **Polar-to-Cartesian Projection:**
    We map the distance and angle to a percentage (0-100%) to plot it on the CSS grid:
    ```javascript
    // Convert bearing to radians
    const angleRad = toRad(bearing);
    // Project relative distance onto axes
    let tcas_x = 50 + (Math.sin(angleRad) * relDist * 50);
    let tcas_y = 50 - (Math.cos(angleRad) * relDist * 50); // Inverted Y for CSS
    ```
4.  **Label Solver:** The worker iterates through the closest 15 planes. If it detects that two text labels will overlap, it dynamically shifts one label to a different corner (Top-Left, Bottom-Right, etc.) relative to the aircraft blip.

---

## ❓ Troubleshooting

**Q: It says "SCANNING..." but never shows planes.**
*   **A:** Double-check your `LAT` and `LON` in the code. Ensure you didn't accidentally swap them.
*   **A:** Ensure `RADIUS_NM` isn't too small (try 50).
*   **A:** Check if you are near an airport that has ADS-B coverage. (Check [airplanes.live](https://airplanes.live) to verify coverage in your area).

**Q: The text labels are cut off at the top/bottom.**
*   **A:** Ensure you are using the **V2.1 CSS/HTML**. The radar scope width is deliberately set to `380px` (smaller than the 480px screen height) to create a safety buffer for text tags at the edge of the range.

**Q: Can I get faster updates?**
*   **A:** The refresh rate is strictly controlled by the TRMNL hardware to preserve battery life.
    *   **Standard:** 15 Minutes.
    *   **Plus:** 5 Minutes.
    *   *Tip:* You can manually trigger a refresh via the TRMNL dashboard if you want to see a live snapshot immediately.

---

## ⚠️ Safety & Liability Disclaimer

This software is for **hobbyist and educational purposes only**.

*   **NOT FOR NAVIGATION:** The data displayed by this plugin is delayed and unverified. It should never be used for air navigation, traffic avoidance, or safety-critical applications.
*   **DATA SOURCE:** Flight data is retrieved from [Airplanes.live](https://airplanes.live/). Availability and accuracy depend entirely on their community network.
*   **NO WARRANTY:** The authors and contributors accept no liability for any damages or issues arising from the use of this software.

---

**License:** MIT
