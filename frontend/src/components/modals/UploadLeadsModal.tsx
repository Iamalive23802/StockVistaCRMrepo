import { useState } from 'react';
import Modal from './Modal';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToastStore } from '../../stores/toastStore';

interface UploadLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5050'
    : 'http://139.59.26.226';

const UploadLeadsModal: React.FC<UploadLeadsModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'file' | 'google'>('file');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Leads">
      <div className="flex justify-center mb-4 space-x-3">
        <button
          onClick={() => setMode('file')}
          className={`px-4 py-2 rounded ${
            mode === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setMode('google')}
          className={`px-4 py-2 rounded ${
            mode === 'google' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Google Sheets Link
        </button>
      </div>

      {mode === 'file' ? (
        <FileUploadSection onClose={onClose} />
      ) : (
        <GoogleSheetsSection onClose={onClose} />
      )}
    </Modal>
  );
};

const FileUploadSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const validateAndSetFile = (selectedFile: File | undefined) => {
    setError('');
    if (!selectedFile) return;

    const validTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (
      !validTypes.includes(selectedFile.type) &&
      !selectedFile.name.endsWith('.csv') &&
      !selectedFile.name.endsWith('.xlsx')
    ) {
      setError('Please upload a valid CSV or Excel (.xlsx) file');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const parseFile = async (): Promise<any[]> => {
    if (!file) throw new Error('No file selected');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  };

  const validatePhoneNumbers = (data: any[]): any[] => {
    return data.filter((row) => {
      const phone = row.Phone?.toString().trim();
      return phone && /^\d{10}$/.test(phone);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      const parsedData = await parseFile();
      const validData = validatePhoneNumbers(parsedData);

      if (validData.length === 0) {
        throw new Error('No valid phone numbers found (must be exactly 10 digits)');
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData),
      });

      if (!response.ok) throw new Error('Failed to upload leads');

      const result = await response.json();
      addToast(
        `✅ Uploaded ${result.validInserted} out of ${result.totalParsed} leads.`,
        'success'
      );

      onClose();
      setFile(null);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to upload leads';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Upload File</label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-400">Drag and drop your CSV or Excel file here, or</p>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
          />
          <label
            htmlFor="file-upload"
            className="mt-2 inline-block px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            Browse Files
          </label>
        </div>

        {file && (
          <div className="mt-3 flex items-center p-2 bg-gray-700 rounded">
            <span className="flex-1 truncate">{file.name}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-white"
              onClick={() => setFile(null)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p><strong>Required columns:</strong></p>
        <ul className="list-disc pl-5 mt-1">
          <li>Full Name</li>
          <li>Email</li>
          <li>Phone (10-digit numbers only)</li>
        </ul>
        <p className="mt-2">Rows missing these fields or with invalid phone numbers will be skipped.</p>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!file || loading}>
          {loading ? 'Uploading...' : 'Upload Leads'}
        </button>
      </div>
    </form>
  );
};

const GoogleSheetsSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [sheetLink, setSheetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sheetLink) {
      setError('Please enter a valid Google Sheets link');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/leads/google-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetLink }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || result.message || 'Failed to upload leads');
      }

      addToast(
        `✅ Uploaded ${result.validInserted} out of ${result.totalParsed} leads.`,
        'success'
      );

      onClose();
      setSheetLink('');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to upload leads';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <label className="form-label">Google Sheets Link</label>
      <input
        type="url"
        value={sheetLink}
        onChange={(e) => setSheetLink(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/..."
        className="form-input mb-4"
      />
      <p className="text-sm text-gray-400 mb-4">
        Your sheet must have columns: <strong>Full Name</strong>, <strong>Email</strong>, and <strong>Phone (10-digit)</strong>.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload Leads'}
        </button>
      </div>
    </form>
  );
};

export default UploadLeadsModal;
