import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import './FileUpload.css';

export const FileUpload = ({ onFileUpload, isUploading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <div className="file-upload-wrapper">
      <div
        className={`file-drop-area glass-panel ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <div className="upload-icon-pulse">
          {isUploading ? (
            <Loader2 size={32} className="spinner" />
          ) : (
            <UploadCloud size={32} className="upload-icon text-gradient" />
          )}
        </div>

        <div className="upload-text">
          <h4>{isUploading ? 'Ingesting & Profiling Dataset...' : 'Drag & drop dataset or browse'}</h4>
          <p>Supports .CSV, .TSV, .JSON (Auto-detects schemas, data types & anomalies)</p>
        </div>

        {selectedFile && !isUploading && (
          <div className="selected-file-badge">
            <File size={14} />
            <span>{selectedFile.name} ({formatBytes(selectedFile.size)})</span>
            <CheckCircle2 size={14} className="text-emerald" />
          </div>
        )}
      </div>
    </div>
  );
};
