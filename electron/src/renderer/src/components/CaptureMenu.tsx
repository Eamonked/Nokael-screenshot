import React, { useState } from 'react';
import './CaptureMenu.css';

interface CaptureMenuProps {
  onCapture: (type: 'screen' | 'window' | 'region') => void;
  onClose: () => void;
}

const CaptureMenu: React.FC<CaptureMenuProps> = ({ onCapture, onClose }) => {
  const [selected, setSelected] = useState<'screen' | 'window' | 'region'>('screen');

  return (
    <div className="capture-menu-modal">
      <div className="capture-menu-title">Screen Capture</div>
      <div className="capture-menu-options">
        <label>
          <input type="radio" name="capture-type" checked={selected === 'screen'} onChange={() => setSelected('screen')} /> Entire Screen
        </label>
        <label>
          <input type="radio" name="capture-type" checked={selected === 'window'} onChange={() => setSelected('window')} /> Active Window
        </label>
        <label>
          <input type="radio" name="capture-type" checked={selected === 'region'} onChange={() => setSelected('region')} /> Region
        </label>
      </div>
      <div className="capture-menu-actions">
        <button className="capture-menu-capture-btn" onClick={() => onCapture(selected)}>
          Capture
        </button>
        <button className="capture-menu-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CaptureMenu; 