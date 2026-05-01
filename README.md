# Emerald Aegis: Defensive Radar ML

A defensive machine learning dashboard simulating the detection of spoofing and jamming anomalies in radar data over Ireland.

## Overview

This project is a React-based web application that visualizes a simulated radar feed and provides tools to inject synthetic anomalies (such as point spoofing and jamming arcs). It features a simulated Machine Learning detection pipeline (representing an Isolation Forest + CNN ensemble) that scans the radar grid, identifies anomalous signatures, and alerts the user in real-time.

The UI is built with a "High Density" technical aesthetic, featuring a 3-column layout, real-time terminal logs, and a custom canvas-based radar visualizer.

## Features

*   **Radar Visualization**: A custom HTML5 Canvas implementation rendering a 2D radar composite grid over a stylized map of Ireland.
*   **Data Pipeline Simulation**: Fetch simulated "normal" weather radar data (representing rain/clouds).
*   **Threat Simulation**:
    *   **Point Spoofing**: Inject isolated, high-intensity spikes simulating spoofed reflections.
    *   **Jamming Arc**: Inject coherent wedges of high intensity simulating wide-band radar interference.
*   **ML Detector**: A simulated detection algorithm that calculates anomaly scores based on spatial isolation and intensity, drawing bounding boxes over detected threats.
*   **System Logs & Metrics**: Real-time terminal output tracking ingestion and detection events, alongside a metrics panel showing simulated model performance (AUC, Precision, FPR).

## Tech Stack

*   **Frontend Framework**: React 19
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4
*   **Icons**: Lucide React

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## License

MIT
