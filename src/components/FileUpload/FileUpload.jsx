import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import './FileUpload.css';

export const FileUpload = ({ onFileUpload, isUploading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const inputRef = useRef(null);

  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.tsv', '.tab', '.json'];
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSelect = (file) => {
    setErrorMessage(null);
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Unsupported file format "${ext}". Please upload CSV, Excel (.xlsx, .xls), TSV, or JSON.`);
      return;
    }

    if (file.size > MAX_SIZE) {
      setErrorMessage(`File size (${formatBytes(file.size)}) exceeds the maximum 50MB limit.`);
      return;
    }

    setSelectedFile(file);
    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div className="file-upload-wrapper">
      <div
        className={`file-drop-area glass-panel ${dragActive ? 'drag-active' : ''} ${errorMessage ? 'drop-area-error' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv,.tab,.json"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <div className="upload-icon-pulse">
          {isUploading ? (
            <Loader2 size={34} className="spinner text-primary-light" />
          ) : (
            <UploadCloud size={34} className="upload-icon text-gradient" />
          )}
        </div>

        <div className="upload-text">
          <h4>{isUploading ? 'Ingesting, Validating & Profiling Dataset...' : 'Drag & drop dataset or browse'}</h4>
          <p>Supports .CSV, .XLSX, .XLS, .TSV, .JSON (Auto-detects schemas, types & quality)</p>
        </div>

        {isUploading && (
          <div className="upload-progress-indicator">
            <span className="badge badge-primary">Parsing Vector Blocks & Computing Moments</span>
          </div>
        )}

        {selectedFile && !isUploading && !errorMessage && (
          <div className="selected-file-badge">
            <File size={14} />
            <span>{selectedFile.name} ({formatBytes(selectedFile.size)})</span>
            <CheckCircle2 size={14} className="text-emerald" />
          </div>
        )}

        {errorMessage && !isUploading && (
          <div className="upload-error-badge" onClick={(e) => e.stopPropagation()}>
            <AlertCircle size={15} className="text-danger" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
