import React, { useEffect, useRef } from 'react';

interface RadarMapProps {
  gridData: number[][]; // 2D array of dBZ values
  detections: { x: number; y: number; type: string; score: number }[];
  width?: number;
  height?: number;
}

const getColorForDbz = (dbz: number) => {
  if (dbz < 10) return 'transparent';
  if (dbz < 20) return 'rgba(0, 236, 255, 0.4)'; // Light blue
  if (dbz < 30) return 'rgba(0, 100, 255, 0.6)'; // Blue
  if (dbz < 40) return 'rgba(0, 255, 0, 0.6)';   // Green
  if (dbz < 50) return 'rgba(255, 255, 0, 0.7)'; // Yellow
  if (dbz < 60) return 'rgba(255, 165, 0, 0.8)'; // Orange
  if (dbz < 70) return 'rgba(255, 0, 0, 0.9)';   // Red
  return 'rgba(255, 0, 255, 1)';                 // Magenta
};

export const RadarMap: React.FC<RadarMapProps> = ({ gridData, detections, width = 400, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = gridData.length;
    const cols = rows > 0 ? gridData[0].length : 0;
    if (rows === 0 || cols === 0) return;

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid data
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dbz = gridData[y][x];
        if (dbz >= 10) {
          ctx.fillStyle = getColorForDbz(dbz);
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
      }
    }

    // Draw detections
    detections.forEach(det => {
      ctx.strokeStyle = '#ff4444'; // Alert red for anomalies
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (det.x - 1) * cellWidth, 
        (det.y - 1) * cellHeight, 
        cellWidth * 3, 
        cellHeight * 3
      );
      
      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo((det.x + 0.5) * cellWidth, (det.y - 2) * cellHeight);
      ctx.lineTo((det.x + 0.5) * cellWidth, (det.y + 3) * cellHeight);
      ctx.moveTo((det.x - 2) * cellWidth, (det.y + 0.5) * cellHeight);
      ctx.lineTo((det.x + 3) * cellWidth, (det.y + 0.5) * cellHeight);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ff4444';
      ctx.font = '10px monospace';
      ctx.fillText(`${det.type} (${(det.score * 100).toFixed(0)}%)`, (det.x + 2) * cellWidth, (det.y - 1) * cellHeight);
    });

  }, [gridData, detections, width, height]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Map Background (Stylized Ireland representation) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg viewBox="0 0 100 120" className="w-[80%] h-[80%] fill-[#1f252d] stroke-[#3a4452] stroke-[1]">
          {/* Rough polygon of Ireland for aesthetic context */}
          <path d="M50 5 L60 10 L70 20 L75 35 L80 50 L75 70 L70 85 L60 105 L50 115 L35 110 L20 100 L15 85 L10 70 L15 55 L20 40 L30 25 L40 10 Z"/>
        </svg>
      </div>
      
      {/* Radar Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Sweeping Radar Line Animation */}
      <div className="absolute inset-0 pointer-events-none animate-[spin_4s_linear_infinite] origin-center rounded-full border-r border-[#00ff88]/30 bg-gradient-to-r from-transparent to-[#00ff88]/10" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }}></div>

      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="relative z-10 w-full h-full object-contain"
      />
    </div>
  );
};
