import React, { useState } from 'react';
import {
  X,
  HardDrive,
  FolderCheck,
  FolderPlus,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileText
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  selectLocalFolder,
  clearStoredDirectoryHandle,
  saveChatToDisk,
  downloadChatFallback
} from '../services/localDiskService';

export default function LocalDiskModal({
  isOpen,
  onClose,
  dirHandle,
  setDirHandle,
  currentChat,
  messages,
  autoSave,
  setAutoSave,
  lastSaveInfo
}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);

  if (!isOpen) return null;

  const isSupported = isFileSystemAccessSupported();
  const folderName = dirHandle?.name || localStorage.getItem('gatepost_disk_folder_name') || '';

  // Trigger Native OS Folder Picker
  const handlePickFolder = async () => {
    setIsSelecting(true);
    setActionStatus(null);
    try {
      const handle = await selectLocalFolder();
      if (handle) {
        setDirHandle(handle);
        setActionStatus({
          type: 'success',
          text: `Successfully linked local folder: "${handle.name}". Chats will be stored here on your disk.`
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setActionStatus({
          type: 'error',
          text: err.message || 'Could not access the selected directory.'
        });
      }
    } finally {
      setIsSelecting(false);
    }
  };

  // Disconnect folder
  const handleDisconnect = async () => {
    await clearStoredDirectoryHandle();
    localStorage.removeItem('gatepost_disk_folder_name');
    setDirHandle(null);
    setActionStatus({
      type: 'info',
      text: 'Local folder unlinked. Conversations will no longer auto-write to disk.'
    });
  };

  // Manual save current conversation to disk
  const handleSaveCurrentNow = async () => {
    if (!dirHandle) {
      setActionStatus({ type: 'error', text: 'Please select a local folder first.' });
      return;
    }
    if (!currentChat && messages.length === 0) {
      setActionStatus({ type: 'info', text: 'No active conversation to save yet.' });
      return;
    }

    setActionStatus({ type: 'loading', text: 'Saving conversation to disk...' });
    const res = await saveChatToDisk(dirHandle, currentChat, messages);
    if (res.success) {
      setActionStatus({
        type: 'success',
        text: `Saved to ${res.folderName}: ${res.savedFiles.join(', ')}`
      });
    } else {
      setActionStatus({
        type: 'error',
        text: `Save failed: ${res.error}. Click "Change Folder" to re-authorize.`
      });
    }
  };

  return (
    <div
      className="auth-overlay-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 10000 }}
    >
      <div className="vault-modal-card local-disk-modal-card">
        {/* Header */}
        <div className="vault-modal-header">
          <div className="vault-title-wrap">
            <div className="vault-icon-circle disk-icon-circle">
              <HardDrive size={22} color="#00f0ff" />
            </div>
            <div>
              <h2 className="vault-modal-title">Client On-Disk Chat Storage</h2>
              <p className="vault-modal-sub">
                Select any folder on <strong>your own computer</strong> to save and sync your conversations directly to disk.
              </p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Privacy Highlight Banner */}
        <div className="disk-privacy-badge">
          <ShieldCheck size={16} color="#10b981" />
          <span>
            <strong>100% Client-Side Privacy:</strong> Your chat files are written directly to your local file system. Nothing is stored on our server disk.
          </span>
        </div>

        {/* Status Card */}
        <div className={`disk-folder-card ${dirHandle ? 'active-connected' : 'not-connected'}`}>
          <div className="disk-folder-card-top">
            <div className="disk-folder-info">
              {dirHandle ? (
                <>
                  <div className="disk-status-indicator online">
                    <span className="disk-dot pulse" />
                    <span>Connected to Local Disk</span>
                  </div>
                  <div className="disk-folder-name-row">
                    <FolderCheck size={20} color="#10b981" />
                    <span className="disk-folder-name" title={folderName}>
                      {folderName || 'Selected Folder'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="disk-status-indicator offline">
                    <span className="disk-dot" />
                    <span>No Folder Selected</span>
                  </div>
                  <div className="disk-folder-name-row">
                    <FolderPlus size={20} color="#94a3b8" />
                    <span className="disk-folder-name unselected">
                      Choose where on your disk to save chats
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Main Action Button */}
            <button
              className="disk-btn-primary"
              onClick={handlePickFolder}
              disabled={isSelecting || !isSupported}
            >
              {isSelecting ? (
                <>
                  <RefreshCw size={14} className="spin-icon" />
                  <span>Selecting...</span>
                </>
              ) : dirHandle ? (
                <>
                  <FolderCheck size={14} />
                  <span>Change Folder</span>
                </>
              ) : (
                <>
                  <FolderPlus size={14} />
                  <span>Select Folder on Disk</span>
                </>
              )}
            </button>
          </div>

          {!isSupported && (
            <div className="disk-browser-warning">
              <AlertCircle size={14} color="#f59e0b" />
              <span>
                Your current browser does not support the native File System Access API. Please use <strong>Google Chrome, Microsoft Edge, or Brave</strong>, or use the direct Download fallback below.
              </span>
            </div>
          )}
        </div>

        {/* Action Status Feedback */}
        {actionStatus && (
          <div className={`disk-action-feedback ${actionStatus.type}`}>
            {actionStatus.type === 'success' && <CheckCircle2 size={16} color="#10b981" />}
            {actionStatus.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
            {actionStatus.type === 'loading' && <RefreshCw size={16} className="spin-icon" color="#38bdf8" />}
            <span>{actionStatus.text}</span>
          </div>
        )}

        {/* Options & Configuration */}
        {dirHandle && (
          <div className="disk-settings-panel">
            <div className="disk-toggle-row">
              <div className="disk-toggle-label">
                <strong>Auto-Save to Disk</strong>
                <p>Instantly update local files whenever you send or receive a message.</p>
              </div>
              <label className="disk-switch">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => {
                    setAutoSave(e.target.checked);
                    localStorage.setItem('gatepost_disk_autosave', e.target.checked ? 'true' : 'false');
                  }}
                />
                <span className="disk-slider round" />
              </label>
            </div>

            <div className="disk-sync-actions-row">
              <button
                className="disk-action-sub-btn"
                onClick={handleSaveCurrentNow}
                title="Save current active conversation to this folder immediately"
              >
                <RefreshCw size={13} />
                <span>Save Current Chat to Disk</span>
              </button>

              <button
                className="disk-disconnect-btn"
                onClick={handleDisconnect}
                title="Stop saving to this folder"
              >
                <span>Disconnect Folder</span>
              </button>
            </div>

            {lastSaveInfo && (
              <div className="disk-last-saved-meta">
                <span>Last saved: {new Date(lastSaveInfo.timestamp).toLocaleTimeString()} to <code>{lastSaveInfo.folderName}</code></span>
              </div>
            )}
          </div>
        )}

        {/* Fallback Direct Download Section */}
        <div className="disk-fallback-section">
          <div className="disk-fallback-title">
            <span>Direct File Download (Instant Save)</span>
          </div>
          <div className="disk-fallback-buttons">
            <button
              className="disk-download-pill"
              onClick={() => downloadChatFallback(currentChat, messages, 'markdown')}
              disabled={!currentChat && messages.length === 0}
            >
              <FileText size={14} />
              <span>Download Markdown (.md)</span>
            </button>
            <button
              className="disk-download-pill"
              onClick={() => downloadChatFallback(currentChat, messages, 'json')}
              disabled={!currentChat && messages.length === 0}
            >
              <FileCode size={14} />
              <span>Download Raw JSON (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
