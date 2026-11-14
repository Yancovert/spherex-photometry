// authentic windows 2000 open file/folder dialog modal
import React, { useState, useRef } from 'react';
import { ScannedFile } from './api';

interface FileDialogProps {
  files: ScannedFile[];
  initialPath: string;
  mode?: 'file' | 'folder';
  onSelect: (path: string) => void;
  onClose: () => void;
}

export const FileDialog: React.FC<FileDialogProps> = ({
  files,
  initialPath,
  mode = 'file',
  onSelect,
  onClose
}) => {
  const [selectedItem, setSelectedItem] = useState<string>(initialPath || (mode === 'folder' ? 'cache' : (files[0]?.path ?? '')));
  const localInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect(file.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 select-none font-sans text-[11px] text-black">
      <div className="win2k-window w-[440px] shadow-2xl">
        {/* titlebar */}
        <div className="win2k-titlebar flex items-center justify-between">
          <span>{mode === 'folder' ? 'Browse For Folder' : 'Open'}</span>
          <button type="button" onClick={onClose} className="win2k-title-btn" title="Close">✕</button>
        </div>

        {/* dialog body */}
        <div className="p-3 space-y-3">
          {/* look in bar */}
          <div className="flex items-center gap-2">
            <span className="w-16">Look in:</span>
            <select className="win2k-select flex-1">
              <option value="cache">cache [Server FITS Storage]</option>
            </select>
            <button
              type="button"
              onClick={() => localInputRef.current?.click()}
              className="win2k-btn whitespace-nowrap"
              title="Browse from your local computer"
            >
              Browse PC...
            </button>
            <input
              type="file"
              ref={localInputRef}
              accept={mode === 'folder' ? undefined : '.fits,.fit'}
              onChange={handleLocalFile}
              className="hidden"
            />
          </div>

          {/* file listview */}
          <div className="win2k-sunken h-48 overflow-y-auto bg-white p-1">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#d4d0c8]">
                <tr>
                  <th className="win2k-raised px-2 py-0.5 font-normal">Name</th>
                  <th className="win2k-raised px-2 py-0.5 font-normal w-24 text-right">Size</th>
                </tr>
              </thead>
              <tbody>
                {mode === 'folder' ? (
                  <>
                    <tr
                      onClick={() => setSelectedItem('cache')}
                      className={`cursor-default ${selectedItem === 'cache' ? 'bg-[#0a246a] text-white' : 'hover:bg-neutral-100 text-black'}`}
                    >
                      <td className="px-2 py-1 font-mono font-bold">[DIR] cache/</td>
                      <td className="px-2 py-1 font-mono text-right">[Directory]</td>
                    </tr>
                    <tr
                      onClick={() => setSelectedItem('/home/yierke/mnt/extra/Sphere-X-port/cache')}
                      className={`cursor-default ${selectedItem.includes('Sphere-X-port') ? 'bg-[#0a246a] text-white' : 'hover:bg-neutral-100 text-black'}`}
                    >
                      <td className="px-2 py-1 font-mono font-bold">[DIR] /home/yierke/mnt/extra/Sphere-X-port/cache</td>
                      <td className="px-2 py-1 font-mono text-right">[Mount]</td>
                    </tr>
                  </>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-2 text-neutral-500 italic">No FITS files found in cache folder.</td>
                  </tr>
                ) : (
                  files.map(f => {
                    const isSelected = selectedItem === f.path || selectedItem === f.name;
                    return (
                      <tr
                        key={f.name}
                        onClick={() => setSelectedItem(f.path)}
                        onDoubleClick={() => {
                          onSelect(f.path);
                          onClose();
                        }}
                        className={`cursor-default ${
                          isSelected ? 'bg-[#0a246a] text-white' : 'hover:bg-neutral-100 text-black'
                        }`}
                      >
                        <td className="px-2 py-0.5 font-mono truncate max-w-[280px]">
                          {f.name}
                        </td>
                        <td className="px-2 py-0.5 font-mono text-right whitespace-nowrap">
                          {(f.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* filename and file type */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-16">{mode === 'folder' ? 'Folder:' : 'File name:'}</span>
              <input
                type="text"
                value={selectedItem}
                onChange={e => setSelectedItem(e.target.value)}
                className="win2k-input flex-1 font-mono text-[11px]"
              />
            </div>
            {mode === 'file' && (
              <div className="flex items-center gap-2">
                <span className="w-16">Files of type:</span>
                <select className="win2k-select flex-1">
                  <option value="fits">FITS Files (*.fits; *.fit)</option>
                  <option value="all">All Files (*.*)</option>
                </select>
              </div>
            )}
          </div>

          {/* action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-300">
            <button
              type="button"
              onClick={handleOpen}
              className="win2k-btn min-w-[75px] font-bold"
            >
              {mode === 'folder' ? 'Select Folder' : 'Open'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="win2k-btn min-w-[75px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
