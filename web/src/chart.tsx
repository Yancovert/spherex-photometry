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
        borderColor: '#0a246a',
        backgroundColor: '#0a246a',
        borderWidth: 1.8,
        pointRadius: 3,
        pointHoverRadius: 5,
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
          label: (item: any) => `Flux: ${item.raw} MJy/sr`
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#e0e0e0' },
        ticks: {
          color: '#000000',
          font: { family: 'Tahoma, sans-serif', size: 9 }
        }
      },
      y: {
        grid: { color: '#e0e0e0' },
        ticks: {
          color: '#000000',
          font: { family: 'Tahoma, sans-serif', size: 9 }
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans select-none text-[11px]">
      <div className="win2k-window w-full max-w-2xl flex flex-col shadow-2xl">
        {/* titlebar */}
        <div className="win2k-titlebar flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <rect width="16" height="16" fill="#000080" />
              <polyline points="2,12 6,4 10,9 14,3" fill="none" stroke="#ffff00" strokeWidth="2" />
            </svg>
            <span className="truncate">
              Spectral Energy Distribution (SED) - [RA {data.ra.toFixed(4)}°, Dec {data.dec.toFixed(4)}°]
            </span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onClose}
              className="win2k-title-btn font-bold cursor-pointer"
              title="Close [Esc]"
            >
              ×
            </button>
          </div>
        </div>

        {/* dialog interior */}
        <div className="p-2 bg-[#d4d0c8] space-y-2 text-black">
          <fieldset className="win2k-groupbox">
            <legend>Linear Variable Filter (102 Spectral Channels)</legend>
            <div className="p-1 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-800">
                <span>Target: <strong>{data.target || 'Selected Target'}</strong></span>
                <span>Epoch {data.epoch} | {data.points.length} NIR Bands</span>
              </div>

              <div className="h-64 w-full win2k-sunken p-1 bg-white">
                <Line data={chartData} options={chartOptions} />
              </div>

              {/* diagnostic molecular ice markers */}
              <div className="pt-1 flex flex-wrap items-center gap-3 text-[10px] text-neutral-700">
                <span className="font-bold">Ice Diagnostics:</span>
                <span>H2O Ice (3.05 µm)</span>
                <span>CH4 Ice (3.30 µm)</span>
                <span>CO2 Ice (4.27 µm)</span>
                <span>CO Ice (4.67 µm)</span>
              </div>
            </div>
          </fieldset>

          {/* dialog action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {data.points.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="win2k-btn h-[23px] px-3 font-bold"
              >
                Export CSV...
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="win2k-btn h-[23px] px-4 font-bold"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
