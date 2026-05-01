import React, { useState, useEffect, useCallback } from 'react';
import { RadarMap } from './components/RadarMap';
import { ShieldAlert, Activity, RefreshCw, Crosshair, Radio, Terminal, Play } from 'lucide-react';
import { cn } from './lib/utils';

const GRID_SIZE = 50;

type Detection = { x: number; y: number; type: string; score: number };
type LogEntry = { time: string; message: string; type: 'info' | 'warning' | 'alert' | 'success' };

export default function App() {
  const [gridData, setGridData] = useState<number[][]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    }, ...prev].slice(0, 50));
  };

  // Initialize empty grid
  const initGrid = useCallback(() => {
    const newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    setGridData(newGrid);
  }, []);

  useEffect(() => {
    initGrid();
    addLog('System initialized. Awaiting radar feed...', 'info');
  }, [initGrid]);

  const generateWeather = () => {
    const newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    
    // Generate some random "weather" blobs
    const numBlobs = Math.floor(Math.random() * 5) + 3;
    for (let b = 0; b < numBlobs; b++) {
      const cx = Math.floor(Math.random() * GRID_SIZE);
      const cy = Math.floor(Math.random() * GRID_SIZE);
      const radius = Math.random() * 8 + 4;
      const intensity = Math.random() * 30 + 20; // 20-50 dBZ

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
          if (dist < radius) {
            // Fade out at edges
            const val = intensity * (1 - dist / radius) + (Math.random() * 10 - 5);
            newGrid[y][x] = Math.max(newGrid[y][x], Math.min(val, 55)); // Cap normal weather at 55
          }
        }
      }
    }
    
    setGridData(newGrid);
    setDetections([]);
    addLog('Ingested new radar composite (Met Éireann ORD).', 'success');
  };

  const injectSpoofing = () => {
    if (gridData.length === 0) return;
    const newGrid = [...gridData.map(row => [...row])];
    
    // Inject 1-3 isolated spikes
    const numSpikes = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numSpikes; i++) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      const y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      
      newGrid[y][x] = 75 + Math.random() * 10; // Very high dBZ
      newGrid[y][x+1] = 65 + Math.random() * 10;
      newGrid[y+1][x] = 65 + Math.random() * 10;
    }
    
    setGridData(newGrid);
    setDetections([]);
    addLog('WARNING: Synthetic point-source spoofing injected into feed.', 'warning');
  };

  const injectJamming = () => {
    if (gridData.length === 0) return;
    const newGrid = [...gridData.map(row => [...row])];
    
    // Inject a jamming arc/wedge
    const cx = GRID_SIZE / 2;
    const cy = GRID_SIZE / 2;
    const angleStart = Math.random() * Math.PI * 2;
    const angleEnd = angleStart + 0.4; // ~20 degree wedge
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const angle = Math.atan2(dy, dx) + Math.PI; // 0 to 2PI
        
        // Normalize angles for comparison
        let inWedge = false;
        if (angleEnd > Math.PI * 2) {
          inWedge = angle >= angleStart || angle <= (angleEnd - Math.PI * 2);
        } else {
          inWedge = angle >= angleStart && angle <= angleEnd;
        }

        if (inWedge) {
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 5) {
            newGrid[y][x] = Math.max(newGrid[y][x], 60 + Math.random() * 15);
          }
        }
      }
    }
    
    setGridData(newGrid);
    setDetections([]);
    addLog('WARNING: Synthetic wide-band jamming interference injected.', 'warning');
  };

  const runDetector = () => {
    if (gridData.length === 0) return;
    setIsScanning(true);
    addLog('Running ML Anomaly Detector (Isolation Forest + CNN)...', 'info');
    
    setTimeout(() => {
      const newDetections: Detection[] = [];
      
      // Simulated detection logic
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        for (let x = 1; x < GRID_SIZE - 1; x++) {
          const val = gridData[y][x];
          
          if (val > 65) {
            // Check neighbors to classify anomaly type
            let highNeighbors = 0;
            for (let ny = -2; ny <= 2; ny++) {
              for (let nx = -2; nx <= 2; nx++) {
                if (ny === 0 && nx === 0) continue;
                const checkY = y + ny;
                const checkX = x + nx;
                if (checkY >= 0 && checkY < GRID_SIZE && checkX >= 0 && checkX < GRID_SIZE) {
                  if (gridData[checkY][checkX] > 55) highNeighbors++;
                }
              }
            }
            
            // If isolated high intensity -> Spoofing
            if (highNeighbors < 4) {
              // Check if we already detected nearby to avoid clustering labels
              const nearby = newDetections.find(d => Math.abs(d.x - x) < 3 && Math.abs(d.y - y) < 3);
              if (!nearby) {
                newDetections.push({ x, y, type: 'SPOOFING', score: 0.85 + Math.random() * 0.14 });
              }
            } 
            // If part of a massive high intensity block -> Jamming
            else if (highNeighbors > 15) {
              const nearby = newDetections.find(d => d.type === 'JAMMING' && Math.abs(d.x - x) < 8 && Math.abs(d.y - y) < 8);
              if (!nearby) {
                newDetections.push({ x, y, type: 'JAMMING', score: 0.90 + Math.random() * 0.09 });
              }
            }
          }
        }
      }
      
      setDetections(newDetections);
      setIsScanning(false);
      
      if (newDetections.length > 0) {
        addLog(`CRITICAL: Detected ${newDetections.length} anomalous signatures!`, 'alert');
        newDetections.forEach(d => {
          addLog(`-> ${d.type} detected at [${d.x}, ${d.y}] (Conf: ${(d.score*100).toFixed(1)}%)`, 'alert');
        });
      } else {
        addLog('Scan complete. No anomalies detected.', 'success');
      }
    }, 800);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0b0c0e] text-[#e0e0e0] font-sans">
      {/* Header */}
      <header className="h-[50px] border-b border-[#2d333b] bg-[#15171b] px-5 flex items-center justify-between shrink-0">
        <div className="font-bold tracking-[1px] text-[#00ff88] text-[14px] flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          EMERALD AEGIS // DEFENSIVE RADAR ML
        </div>
        <div className="flex gap-5 font-mono text-[11px] items-center">
          <span>SESSION_ID: 9X-ALPHA</span>
          <span>MODE: MONITORING</span>
          <span className="text-[#00ff88] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span>
            </span>
            SYSTEM_HEALTH: NOMINAL
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-[1px] bg-[#2d333b] overflow-hidden">
        
        {/* Left Panel: Controls */}
        <div className="bg-[#15171b] p-[15px] flex flex-col gap-[15px] overflow-y-auto">
          <div>
            <div className="text-[10px] uppercase tracking-[2px] text-[#888888] border-l-[3px] border-[#00ff88] pl-[8px] mb-[10px] flex items-center gap-2">
              <Activity className="w-3 h-3" /> Data Pipeline
            </div>
            
            <button 
              onClick={generateWeather}
              className="flex items-center justify-center gap-2 w-full bg-black/30 hover:bg-black/50 text-[#e0e0e0] border border-[#2d333b] hover:border-[#00ff88]/50 py-2 px-4 rounded-[4px] transition-colors font-mono text-[11px]"
            >
              <RefreshCw className="w-3 h-3" /> Fetch Radar Composite
            </button>
          </div>

          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-[2px] text-[#888888] border-l-[3px] border-[#00ff88] pl-[8px] mb-[10px] flex items-center gap-2">
              <Crosshair className="w-3 h-3" /> Threat Simulation
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={injectSpoofing}
                className="flex items-center justify-center gap-2 w-full bg-black/30 hover:bg-black/50 text-[#ff4444] border border-[#2d333b] hover:border-[#ff4444]/50 py-2 px-4 rounded-[4px] transition-colors font-mono text-[11px]"
              >
                <Radio className="w-3 h-3" /> Inject Point Spoofing
              </button>
              
              <button 
                onClick={injectJamming}
                className="flex items-center justify-center gap-2 w-full bg-black/30 hover:bg-black/50 text-[#ff4444] border border-[#2d333b] hover:border-[#ff4444]/50 py-2 px-4 rounded-[4px] transition-colors font-mono text-[11px]"
              >
                <Radio className="w-3 h-3" /> Inject Jamming Arc
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button 
              onClick={runDetector}
              disabled={isScanning || gridData.length === 0}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 px-4 rounded-[4px] transition-all font-mono text-[12px] font-bold tracking-widest uppercase",
                isScanning 
                  ? "bg-[#00ff88]/5 text-[#00ff88]/50 border border-[#00ff88]/10 cursor-not-allowed" 
                  : "bg-[#00ff88]/10 hover:bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]"
              )}
            >
              {isScanning ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Play className="w-4 h-4" /> Run ML Detector</>
              )}
            </button>
          </div>
        </div>

        {/* Center Panel: Radar Visualization */}
        <div className="relative bg-[radial-gradient(circle_at_center,#1b2028_0%,#0b0c0e_100%)] flex flex-col overflow-hidden">
          {/* HUD Overlay */}
          <div className="absolute top-[10px] left-[10px] right-[10px] bottom-[10px] pointer-events-none border border-[rgba(0,255,136,0.1)] flex flex-col justify-between z-20">
            <div className="absolute w-[20px] h-[20px] border border-[#00ff88] top-[-1px] left-[-1px] border-r-0 border-b-0"></div>
            <div className="absolute w-[20px] h-[20px] border border-[#00ff88] top-[-1px] right-[-1px] border-l-0 border-b-0"></div>
            <div className="absolute w-[20px] h-[20px] border border-[#00ff88] bottom-[-1px] left-[-1px] border-r-0 border-t-0"></div>
            <div className="absolute w-[20px] h-[20px] border border-[#00ff88] bottom-[-1px] right-[-1px] border-l-0 border-t-0"></div>
          </div>
          
          <div className="absolute top-[20px] left-[20px] right-[20px] flex justify-between items-center z-20">
            <div className="text-[10px] uppercase tracking-[2px] text-[#888888] border-l-[3px] border-[#00ff88] pl-[8px]">
              Live Composite (Simulated)
            </div>
            <div className="flex gap-3 text-[10px] font-mono text-[#888888]">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[rgba(0,100,255,0.8)]"></div> Light Rain</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[rgba(255,255,0,0.8)]"></div> Heavy Rain</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff4444]"></div> Anomaly</span>
            </div>
          </div>

          <div className="absolute bottom-[20px] right-[20px] text-right z-20 font-mono">
            <div className="text-[10px] text-[#888888]">COORDINATES: 53.3498° N, 6.2603° W</div>
            <div className="text-[10px] text-[#888888]">SCAN RADIUS: 240KM</div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-[500px] aspect-square relative z-10">
              <RadarMap gridData={gridData} detections={detections} width={500} height={500} />
            </div>
          </div>
        </div>

        {/* Right Panel: Metrics */}
        <div className="bg-[#15171b] p-[15px] flex flex-col gap-[15px] overflow-y-auto">
          <div>
            <div className="text-[10px] uppercase tracking-[2px] text-[#888888] border-l-[3px] border-[#00ff88] pl-[8px] mb-[10px]">
              Model Metrics
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-black/30 border border-[#2d333b] p-[10px] rounded-[4px]">
                <div className="flex justify-between text-[10px] text-[#888888] mb-[4px] font-mono">
                  <span>Isolation Forest AUC</span>
                  <span className="text-[#00ff88]">0.94</span>
                </div>
                <div className="w-full bg-[#15171b] rounded-full h-1.5 border border-[#2d333b]">
                  <div className="bg-[#00ff88] h-full rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
              
              <div className="bg-black/30 border border-[#2d333b] p-[10px] rounded-[4px]">
                <div className="flex justify-between text-[10px] text-[#888888] mb-[4px] font-mono">
                  <span>CNN Precision@k</span>
                  <span className="text-[#00ff88]">0.89</span>
                </div>
                <div className="w-full bg-[#15171b] rounded-full h-1.5 border border-[#2d333b]">
                  <div className="bg-[#00ff88] h-full rounded-full" style={{ width: '89%' }}></div>
                </div>
              </div>
              
              <div className="bg-black/30 border border-[#2d333b] p-[10px] rounded-[4px]">
                <div className="flex justify-between text-[10px] text-[#888888] mb-[4px] font-mono">
                  <span>False Positive Rate</span>
                  <span className="text-[#00ff88]">0.02</span>
                </div>
                <div className="w-full bg-[#15171b] rounded-full h-1.5 border border-[#2d333b]">
                  <div className="bg-[#00ff88] h-full rounded-full" style={{ width: '2%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-[2px] text-[#888888] border-l-[3px] border-[#00ff88] pl-[8px] mb-[10px]">
              Alert Thresholds
            </div>
            <div className="flex justify-between font-mono text-[12px] py-[6px] border-b border-white/5">
              <span>Spoofing</span>
              <span className="text-[#ff4444]">CRITICAL</span>
            </div>
            <div className="flex justify-between font-mono text-[12px] py-[6px] border-b border-white/5">
              <span>Jamming</span>
              <span className="text-[#00ff88]">STANDBY</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Panel: Terminal Logs */}
      <div className="h-[180px] border-t border-[#2d333b] bg-[#000] p-[10px] font-mono text-[11px] text-[#66bb66] leading-[1.4] overflow-y-auto flex flex-col-reverse shrink-0">
        <div className="flex flex-col-reverse space-y-1 space-y-reverse">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start">
              <span className="text-[#888888] mr-2 shrink-0">[{log.time}]</span>
              <span className={cn(
                "inline-block px-[6px] py-[2px] rounded-[2px] text-[9px] mr-[5px] font-bold shrink-0",
                (log.type === 'info' || log.type === 'success') ? "bg-[#1e3a8a] text-[#93c5fd]" : "bg-[#7f1d1d] text-[#fca5a5]"
              )}>
                {log.type === 'info' ? 'INFO' : log.type === 'success' ? 'SUCCESS' : log.type === 'warning' ? 'WARN' : 'ALARM'}
              </span>
              <span className={cn(
                "break-words",
                (log.type === 'warning' || log.type === 'alert') && "text-[#ff4444]"
              )}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
