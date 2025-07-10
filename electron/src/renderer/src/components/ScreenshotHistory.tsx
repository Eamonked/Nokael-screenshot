import React, { useEffect, useState } from 'react';
import './ScreenshotHistory.css';

const ScreenshotHistory: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, size: 0, files: [] });
  const [editing, setEditing] = useState<{ [key: string]: boolean }>({});
  const [fields, setFields] = useState<{ [key: string]: { remarks: string; incident: string; area: string } }>({});

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getScreenshotStats) {
      window.electronAPI.getScreenshotStats().then((data: any) => {
        setStats(data);
        const initialFields: any = {};
        data.files.forEach((file: any) => {
          initialFields[file.name] = {
            remarks: file.remarks || '',
            incident: file.incident || '',
            area: file.area || ''
          };
        });
        setFields(initialFields);
      });
    }
  }, []);

  const handleFieldChange = (file: string, field: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [file]: { ...prev[file], [field]: value }
    }));
  };

  const handleEdit = (file: string) => {
    setEditing(prev => ({ ...prev, [file]: true }));
  };

  const handleSave = async (file: string) => {
    setEditing(prev => ({ ...prev, [file]: false }));
    if (window.electronAPI && window.electronAPI.updateScreenshotMetadata) {
      await window.electronAPI.updateScreenshotMetadata(file, fields[file]);
    }
  };

  return (
    <div className="screenshot-history-container">
      <h2>Screenshot History</h2>
      <div style={{ marginBottom: 16 }}>
        <strong>Total Screenshots:</strong> {stats.total}
        <br />
        <strong>Total Size:</strong> {(stats.size / 1024).toFixed(2)} KB
      </div>
      <ul>
        {stats.files.length === 0 && <li>No screenshots yet</li>}
        {stats.files.map((file: any) => (
          <li key={file.name} className="screenshot-history-list-item">
            <div>
              <strong>{file.name}</strong> - {(file.size / 1024).toFixed(2)} KB - {new Date(file.mtime).toLocaleString()}
            </div>
            <div className="screenshot-history-fields">
              {editing[file.name] ? (
                <>
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={fields[file.name]?.remarks || ''}
                    onChange={e => handleFieldChange(file.name, 'remarks', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Incident"
                    value={fields[file.name]?.incident || ''}
                    onChange={e => handleFieldChange(file.name, 'incident', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Area"
                    value={fields[file.name]?.area || ''}
                    onChange={e => handleFieldChange(file.name, 'area', e.target.value)}
                  />
                  <button onClick={() => handleSave(file.name)}>Save</button>
                </>
              ) : (
                <>
                  <span>Remarks: {fields[file.name]?.remarks || ''} </span>
                  <span>Incident: {fields[file.name]?.incident || ''} </span>
                  <span>Area: {fields[file.name]?.area || ''} </span>
                  <button className="screenshot-history-edit-btn" onClick={() => handleEdit(file.name)}>Edit</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScreenshotHistory; 