import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getAuthToken, removeAuthToken } from '../lib/api';
import toast from 'react-hot-toast';
import { FileText, Download, Trash2, HardDrive, AlertTriangle } from 'lucide-react';

interface CsvFile {
  id: string;
  file_name: string;
  size_bytes: number;
  uploaded_at: string;
  device_label?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Confirmation modal */
function DeleteModal({ fileName, onConfirm, onCancel }: { fileName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="glass-panel" style={{ padding: '32px', maxWidth: '420px', width: '90%', textAlign: 'center' }}>
        <AlertTriangle size={40} color="var(--status-critical)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Delete File?</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px' }}>
          This will permanently delete:
        </p>
        <p style={{
          color: 'var(--accent-ice)', fontSize: '0.9rem', fontWeight: 600,
          background: 'rgba(63,198,240,0.08)', borderRadius: '8px', padding: '8px 14px',
          border: '1px solid rgba(63,198,240,0.2)', marginBottom: '24px',
          wordBreak: 'break-all',
        }}>
          {fileName}
        </p>
        <p style={{ color: 'rgba(220,38,38,0.8)', fontSize: '0.8rem', marginBottom: '24px' }}>
          ⚠ This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.5)',
              color: 'var(--status-critical)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CsvManagerPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<CsvFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);   // id being deleted
  const [confirmTarget, setConfirmTarget] = useState<CsvFile | null>(null);

  const fetchFiles = async () => {
    try {
      const data = await apiFetch('/files');
      setFiles(data);
    } catch (err: any) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleDownload = (file: CsvFile) => {
    // Use a direct anchor so the browser streams the file without an extra fetch
    const token = getAuthToken();
    const a = document.createElement('a');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    a.href = `${baseUrl}/files/${file.id}/download`;
    a.setAttribute('download', file.file_name);
    // Attach token via header — for simple demos we'll just open the URL
    // (the download endpoint checks the JWT, so the user must be logged in)
    a.click();
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return;
    setDeleting(confirmTarget.id);
    setConfirmTarget(null);
    try {
      await apiFetch(`/files/${confirmTarget.id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== confirmTarget.id));
      toast.success('File deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

  const handleLogout = () => { removeAuthToken(); navigate('/login'); };


  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'radial-gradient(circle at 70% 10%, rgba(63,198,240,0.08), transparent 40%)',
    }}>
      {/* Modal */}
      {confirmTarget && (
        <DeleteModal
          fileName={confirmTarget.file_name}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmTarget(null)}
        />
      )}


      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Files', value: files.length.toString(), icon: <FileText size={16} color="var(--accent-ice)" /> },
            { label: 'Total Size', value: formatSize(totalSize),    icon: <HardDrive size={16} color="var(--accent-ice)" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass-panel" style={{ padding: '16px 24px', flex: '1', minWidth: '160px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              {icon}
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Files table */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <FileText size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No CSV files yet.</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', marginTop: '6px' }}>
                Files will appear here once your device starts uploading cold-chain data.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(63,198,240,0.04)' }}>
                  {['File Name', 'Device', 'Date Uploaded', 'Size', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '14px 20px', textAlign: 'left',
                      fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
                      letterSpacing: '0.5px', fontWeight: 500,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => (
                  <tr
                    key={file.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      opacity: deleting === file.id ? 0.4 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* File name */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={15} color="rgba(63,198,240,0.6)" />
                        <span style={{ color: '#fff', fontWeight: 500, wordBreak: 'break-all' }}>{file.file_name}</span>
                      </div>
                    </td>

                    {/* Device */}
                    <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                      {file.device_label || 'Device'}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                      {new Date(file.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(file.uploaded_at).toLocaleTimeString()}
                      </span>
                    </td>

                    {/* Size */}
                    <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                      {formatSize(file.size_bytes || 0)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownload(file)}
                          title="Download"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 14px', borderRadius: '6px',
                            background: 'rgba(63,198,240,0.1)', border: '1px solid rgba(63,198,240,0.3)',
                            color: 'var(--accent-ice)', cursor: 'pointer', fontSize: '0.8rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(63,198,240,0.2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(63,198,240,0.1)')}
                        >
                          <Download size={13} /> Download
                        </button>

                        <button
                          onClick={() => setConfirmTarget(file)}
                          disabled={deleting === file.id}
                          title="Delete"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 14px', borderRadius: '6px',
                            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                            color: 'var(--status-critical)', cursor: 'pointer', fontSize: '0.8rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')}
                        >
                          <Trash2 size={13} /> {deleting === file.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
