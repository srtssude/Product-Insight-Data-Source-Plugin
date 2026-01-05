# Product Insight Data Source Plugin (Grafana)
**Course:** MIS 233 – Fall 2025  
**Developer:** Zeynep Sude Sarıtaş 

## Overview
Product Insight is a Grafana **Data Source plugin** that generates product analytics metrics (MRR, DAU, Orders, Churn) with:
- **Time-series + Table** output (Grafana-native DataFrames)
- **Predictive Analytics (AI Forecast)** using client-side regression
- **Forecast Horizon Slider** for an instant UI 
- **Anomaly detection** with configurable threshold
- **AI Insights** frame (summary + recommendation)
- **Robust error handling** + notices + Simulation Mode fallback

This plugin is designed for a clean demo: even if the backend API is down or unauthorized, Grafana still renders realistic data.


## Installation & Build Instructions

### 1) Prerequisites
- Node.js 
- npm 
- Docker Desktop ( for Grafana)

## Installation & Build Instructions

1.  **Prerequisites:** Ensure `Node.js` is installed.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Build the Plugin:**
    ```bash
    npm run build
    ```
4.  **Run in Development Mode:**
    ```bash
    npm run dev
    ``
5.  **Restart Grafana:** The plugin should now be visible in your visualization list.

## Bonus & Justification

I have implemented the bonus features below. Here is the breakdown:

### 1. REST API Integration + Reliable Fallback (Data Source Bonus)
* **External API Integration:** The plugin fetches real product metrics from a REST backend endpoint (`/api/metrics`) and validates health via `/api/health`.
* **Graceful Error Handling:** If the backend is unreachable or returns an error (e.g., 401 Unauthorized), the plugin does not fail — it shows a clear Grafana notice and continues.
* **Simulation Mode (Demo-Safe):** When the API cannot be reached, the plugin automatically switches to a built-in simulation engine that generates realistic time-series data.  
  → This guarantees the instructor can always run the demo and see charts.

### 2. Client-Side “AI” Analytics 
* **Predictive Analytics / AI Forecast:** Implemented a JavaScript/TypeScript forecast engine using simple linear regression on the returned metric series.
* **Forecast Horizon Control (UI):** The Query Editor provides a Forecast Horizon control (0–24) so the user can extend the forecast into the future during the demo.
* **Guaranteed Visibility:** Forecast is returned as a dedicated DataFrame/series (“AI Forecast …”) so it reliably appears in Time series visualizations.

### 3. Advanced Query Options (Query Editor Parameters)
* **Metric Selector:** Users can query multiple KPIs: `MRR`, `DAU`, `Orders`, `Churn`.
* **Interactive Toggles:** Predictive Analytics and AI Insights can be enabled/disabled with switches.
* **Anomaly Threshold Override:** Users can optionally override the default anomaly threshold (e.g., MRR default, churn default) directly from the Query Editor.
* **UX/Clarity:** Settings are grouped and labeled so the required “student name” and core controls are immediately visible.

### 4. Data Modeling for Grafana (Time-Series + Table Output)
* **Time-Series Conversion:** API JSON is converted into Grafana-native DataFrames suitable for Time series charts (Time + values).
* **Derived Fields:** The plugin computes additional derived series such as **Growth Index** and **Anomaly Score**.
* **AI Insights Table Frame:** When enabled, the plugin outputs an extra table frame (“AI Insights”) that summarizes:
  - % change over the selected range  
  - anomaly count  
  - threshold used  
  - short recommendation text

---
