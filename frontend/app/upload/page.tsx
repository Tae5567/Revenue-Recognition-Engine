'use client';
import { useState, useCallback } from 'react';

export default function UploadPage() {
  const [contractText, setContractText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setContractText(ev.target?.result as string);
      reader.readAsText(file);
    }
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setContractText(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const parseContract = async () => {
    if (!contractText.trim()) return;
    setParsing(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/contracts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_text: contractText }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const SAMPLE = `Master Services Agreement — Acme Corporation
Contract #: CONTRACT-2024-001
Start: January 1, 2024 | End: December 31, 2025
Total Contract Value: $240,000

Services:
1. SaaS Platform License — 24-month access, $180,000 (recognized over time)
2. Implementation Services — one-time setup, $30,000 (recognized at completion)
3. Support & Maintenance — annual, $30,000 (recognized over time)

Payment: $120,000 due Jan 1, 2024 and $120,000 due Jan 1, 2025.`;

  return (
    <>
      <div className="page-header">
        <h1>Upload Contract</h1>
        <p>AI parses contract terms and identifies ASC 606 performance obligations automatically</p>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 760 }}>

          {/* Step 1 */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2>Step 1 — Contract Text</h2>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setContractText(SAMPLE)}>
                Load sample
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Drop zone */}
              <label
                className={`dropzone ${dragging ? 'active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                htmlFor="file-input"
                style={{ cursor: 'pointer' }}
              >
                <div className="dropzone-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#475467" strokeWidth="1.5">
                    <path d="M8 10V3M5 6l3-3 3 3"/><path d="M2 11v1.5A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5V11"/>
                  </svg>
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>Drop file here or click to browse</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>.txt, .pdf, .csv</p>
                <input id="file-input" type="file" accept=".txt,.pdf,.csv" style={{ display: 'none' }} onChange={handleFilePick} />
              </label>

              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>or paste below</div>

              <div>
                <label className="form-label">Contract text</label>
                <textarea
                  className="form-textarea"
                  placeholder="Paste contract text here..."
                  value={contractText}
                  onChange={e => setContractText(e.target.value)}
                  style={{ minHeight: 180 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={parseContract}
                  disabled={parsing || !contractText.trim()}
                >
                  {parsing ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2"/><path d="M21 12a9 9 0 01-9 9"/>
                      </svg>
                      Parsing with AI...
                    </>
                  ) : 'Parse Contract with AI'}
                </button>
              </div>

              {error && <div className="alert alert-error">{error}. Check that the backend is running.</div>}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="card">
              <div className="card-header">
                <h2>Parse Results</h2>
                <span className={`badge ${result.confidence === 'high' ? 'badge-green' : result.confidence === 'medium' ? 'badge-amber' : 'badge-red'}`}>
                  {result.confidence} confidence
                </span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {result.flags?.length > 0 && (
                  <div className="alert alert-warning">
                    <strong>Recognition flags: </strong>
                    {result.flags.map((f: string) => f.replace(/_/g, ' ')).join(' · ')}
                  </div>
                )}

                <div>
                  <p className="form-label" style={{ marginBottom: 10 }}>Performance Obligations</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.parsed_terms?.performance_obligations?.map((pob: any) => (
                      <div key={pob.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{pob.name}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{pob.description}</p>
                          {pob.recognition_rationale && (
                            <p style={{ color: 'var(--accent)', fontSize: 11.5, marginTop: 4, fontStyle: 'italic' }}>{pob.recognition_rationale}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 16 }}>
                          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 600, color: '#16A34A' }}>
                            ${parseFloat(pob.allocated_value || 0).toLocaleString()}
                          </p>
                          <span className={`badge ${pob.satisfaction_method === 'over_time' ? 'badge-blue' : 'badge-amber'}`} style={{ marginTop: 4 }}>
                            {pob.satisfaction_method?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/schedules?contract_id=${result.contract_id}`} className="btn btn-primary">Generate Schedule</a>
                  <a href="/contracts" className="btn btn-secondary">View All Contracts</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}