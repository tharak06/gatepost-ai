import React, { useState, useEffect } from 'react';
import { X, Cloud, FileText, Download, ShieldCheck, Clock } from 'lucide-react';

export default function CloudVaultModal({ isOpen, onClose, token }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && token) {
      fetchFiles();
    }
  }, [isOpen, token]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chats/user/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFiles(data.data);
      }
    } catch (e) {
      console.warn('Failed to load cloud files', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-overlay-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vault-modal-card">
        <div className="vault-modal-header">
          <div className="vault-title-wrap">
            <div className="vault-icon-circle">
              <Cloud size={20} color="#00f0ff" />
            </div>
            <div>
              <h2 className="vault-modal-title">Cloud Storage Vault</h2>
              <p className="vault-modal-sub">
                Files are retained for <strong>30 days</strong>, after which they are automatically deleted for privacy.
              </p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="vault-stats-bar">
          <div className="vault-stat-item">
            <Clock size={14} color="#38bdf8" />
            <span>30-Day Auto-Purge: <strong>Active</strong></span>
          </div>
          <div className="vault-stat-item">
            <span>Saved Files: <strong>{files.length}</strong></span>
          </div>
        </div>

        <div className="vault-files-grid">
          {loading && <div className="vault-empty-state">Loading saved media...</div>}

          {!loading && files.length === 0 && (
            <div className="vault-empty-state">
              <Cloud size={40} color="#64748b" style={{ marginBottom: '1rem' }} />
              <h3>No saved files in your vault</h3>
              <p>When chatting, toggle <strong>"☁️ Save to Cloud"</strong> before uploading an image or PDF. It will be stored in your account for 30 days and then automatically deleted.</p>
            </div>
          )}

          {!loading && files.map((file) => {
            const expTime = file.expiresAt
              ? new Date(file.expiresAt).getTime()
              : new Date(file.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000;
            const daysLeft = Math.max(1, Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <div key={file._id || file.id} className="vault-file-card">
                <div className="vault-card-preview">
                  {file.file_type === 'image' ? (
                    <img src={file.file_url} alt={file.filename} className="vault-img-thumb" />
                  ) : (
                    <div className="vault-pdf-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                      <FileText size={32} color="#00f0ff" />
                      <span style={{ fontSize: '0.75rem' }}>PDF Document</span>
                    </div>
                  )}
                </div>

                <div className="vault-card-meta">
                  <span className="vault-filename" title={file.filename}>{file.filename}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <span className="vault-date">{new Date(file.createdAt).toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                      {daysLeft}d left
                    </span>
                  </div>
                </div>

                <div className="vault-card-actions">
                  <a
                    href={file.file_url}
                    download={file.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="vault-action-btn"
                    title="Download or Open"
                  >
                    <Download size={14} /> Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
