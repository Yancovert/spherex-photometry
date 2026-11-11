import React, { useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SpectrumData } from './api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SpectralModalProps {
  data: SpectrumData | null;
  onClose: () => void;
}

export const SpectralModal: React.FC<SpectralModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  const handleExportCsv = () => {
    if (!data.points.length) return;
    const header = 'wavelength_um,flux_mjy_sr,band,array\n';
    const rows = data.points
      .map(p => `${p.wavelength},${p.flux},${p.band},${p.array}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spectrum_${data.ra.toFixed(4)}_${data.dec.toFixed(4)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chartData = {
    labels: data.points.map(p => `${p.wavelength} µm`),
    datasets: [
      {
        label: 'Flux (MJy/sr)',
        data: data.points.map(p => p.flux),
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (items: any[]) => {
            const idx = items[0]?.dataIndex;
            const pt = data.points[idx];
            return `Wavelength: ${pt?.wavelength} µm (Band ${pt?.band}, Array ${pt?.array})`;
          },
          label: (item: any) => `Measured Flux: ${item.raw} MJy/sr`
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#1a1a1a' },
        ticks: {
          color: '#888888',
          font: { family: 'monospace', size: 10 }
        }
      },
      y: {
        grid: { color: '#1a1a1a' },
        ticks: {
          color: '#888888',
          font: { family: 'monospace', size: 10 }
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono select-none">
      <div className="bg-mono-950 border border-mono-700 w-full max-w-2xl overflow-hidden flex flex-col text-xs shadow-2xl rounded">
        <div className="px-3 py-2 border-b border-mono-800 flex items-center justify-between text-mono-300">
          <div>
            Spectrum: {data.target || 'Selected Coordinate'} (RA {data.ra.toFixed(4)}°, DEC {data.dec.toFixed(4)}°)
          </div>
          <div className="flex items-center gap-2">
            {data.points.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="border border-mono-700 hover:border-mono-400 text-mono-300 hover:text-white px-2 py-0.5 rounded text-[11px] transition"
              >
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="border border-mono-700 hover:border-mono-400 text-mono-400 hover:text-white px-2 py-0.5 rounded text-[11px] transition"
            >
              Close [Esc]
            </button>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2">
          {data.points.length > 0 ? (
            <>
              <div className="h-64 w-full bg-mono-900 border border-mono-800 p-2 rounded">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="text-[11px] text-mono-400 flex justify-between px-1">
                <span>Authentic Level 2 measurement</span>
                <span>{data.points.length} spectral sample(s)</span>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-mono-500 border border-mono-800 rounded">
              No SPHEREx survey coverage or observation data at these coordinates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
