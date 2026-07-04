import { useState, useRef } from 'react';

const MAX_SIZE_MB = 5;

/**
 * Reusable drag-and-drop file picker. Purely presentational/UX — the parent
 * owns what happens with the selected file (onFileSelected) and any upload
 * progress state, so this component can be reused for resumes today and any
 * other file upload later without change.
 */
const DragDropZone = ({ onFileSelected, uploading, accept = '.pdf', hint = 'PDF only, max 5MB' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [hoveredFileName, setHoveredFileName] = useState('');
  const inputRef = useRef(null);

  const validateAndEmit = (file) => {
    setError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setHoveredFileName('');
    const file = e.dataTransfer.files?.[0];
    validateAndEmit(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const file = e.dataTransfer.items?.[0];
    if (file?.type) setHoveredFileName(file.type === 'application/pdf' ? 'PDF file' : 'Unsupported file');
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setHoveredFileName('');
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    validateAndEmit(file);
    e.target.value = ''; // allow re-selecting the same file name after removal
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
          uploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={uploading}
          className="hidden"
          aria-label="Upload resume PDF"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-600">Uploading and parsing your resume…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? (hoveredFileName || 'Drop file here') : 'Drag PDF here or click to select'}
            </p>
            <p className="text-xs text-gray-400">{hint}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default DragDropZone;
