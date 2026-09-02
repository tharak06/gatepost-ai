import React, { useState } from 'react';
import { BookOpen, Terminal, Shield, Copy, Check } from 'lucide-react';

export default function ResourcesSection() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('curl');

  const codeSnippets = {
    curl: `curl -X POST http://localhost:5000/api/chats/YOUR_CHAT_ID/upload-image \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "file=@sample.png" \\
  -F "prompt=Analyze this visual structure"`,
    js: `// In-Memory Upload via JavaScript (Node / Browser)
const formData = new FormData();
formData.append('file', fileBlob, 'sample.png');
formData.append('prompt', 'Analyze in memory');

const res = await fetch('http://localhost:5000/api/chats/' + chatId + '/upload-image', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
});
const data = await res.json();
console.log(data);`,
    python: `# In-Memory Analysis via Python
import requests

with open("document.pdf", "rb") as f:
    files = {"file": ("document.pdf", f.read(), "application/pdf")}
    data = {"prompt": "Extract and audit compliance terms"}
    res = requests.post(
        f"http://localhost:5000/api/chats/{chat_id}/upload-pdf",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
print(res.json())`
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="site-section" id="resources">
      <div className="section-header-wrap">
        <div className="section-badge">
          <BookOpen size={13} /> Architecture & Docs
        </div>
        <h2 className="section-title">Developer Resources & Privacy Blueprint</h2>
        <p className="section-subtitle">
          Transparent, auditable, and built for rapid integration. Discover the architecture behind zero-persistence media buffers.
        </p>
      </div>

      <div className="resources-container">
        {/* Left Column: Privacy Architecture Whitepaper */}
        <div className="whitepaper-card">
          <div className="whitepaper-header">
            <Shield size={24} color="#00f0ff" />
            <h3 className="whitepaper-title">Physical Schema Barrier</h3>
          </div>
          <p className="whitepaper-desc">
            Unlike standard AI apps that save uploaded photos to S3 buckets and store paths in SQL databases, GatePost's database schema physically lacks any column capable of holding file paths or binary blobs.
          </p>

          <div className="lifecycle-steps">
            <div className="lifecycle-step">
              <span className="step-num">1</span>
              <div>
                <strong>RAM Buffer Ingestion</strong>
                <p>Upload streams directly into an in-memory byte buffer via Multer memoryStorage.</p>
              </div>
            </div>
            <div className="lifecycle-step">
              <span className="step-num">2</span>
              <div>
                <strong>Transient Gemini Transit</strong>
                <p>Bytes are sent over TLS directly to Gemini models for inference.</p>
              </div>
            </div>
            <div className="lifecycle-step">
              <span className="step-num">3</span>
              <div>
                <strong>Immediate Memory Wipe</strong>
                <p>Variables holding raw binary bytes are immediately dereferenced and erased.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Snippet Playground */}
        <div className="code-playground-card">
          <div className="code-playground-header">
            <div className="tab-buttons">
              <button
                className={`code-tab-btn ${activeTab === 'curl' ? 'active' : ''}`}
                onClick={() => setActiveTab('curl')}
              >
                cURL
              </button>
              <button
                className={`code-tab-btn ${activeTab === 'js' ? 'active' : ''}`}
                onClick={() => setActiveTab('js')}
              >
                JavaScript
              </button>
              <button
                className={`code-tab-btn ${activeTab === 'python' ? 'active' : ''}`}
                onClick={() => setActiveTab('python')}
              >
                Python
              </button>
            </div>
            <button className="copy-code-btn" onClick={copyToClipboard}>
              {copied ? <Check size={14} color="#00f0ff" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="code-block-preview">
            <code>{codeSnippets[activeTab]}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
