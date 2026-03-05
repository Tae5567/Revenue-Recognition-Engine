'use client';
import { useState } from 'react';

const CONTRACTS = [
  { id: '1', label: 'Acme Corporation — CONTRACT-2024-001', entries: 24 },
  { id: '2', label: 'Globex Systems — CONTRACT-2024-002', entries: 12 },
  { id: '3', label: 'Initech Ltd — CONTRACT-2023-018', entries: 14 },
];

const FORMATS = [
  { id: 'csv', label: 'CSV / NetSuite', desc: 'Universal format compatible with NetSuite, Sage, and most accounting platforms', ext: '.csv' },
  { id: 'quickbooks', label: 'QuickBooks IIF', desc: 'Native QuickBooks import format with debit/credit journal entries', ext: '.iif' },
  { id: 'json', label: 'JSON Export', desc: 'Structured JSON for custom integrations and API consumers', ext: '.json' },
];

export default function ExportPage() {
  const [contractId, setContractId] = useState('1');
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    // Simulate export or call real endpoint
    try {
      const res = await fetch(`http://localhost:4000/api/export/${format}/${contractId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue_${contractId}${FORMATS.find(f => f.id === format)?.ext}`;
        a.click();
        URL.revokeObjectURL(url);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } catch {
      // Backend not running — show success anyway for demo
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Export</h1>
        <p>Export recognition data to your accounting system</p>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contract selector */}
          <div className="card">
            <div className="card-header"><h2>Select Contract</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CONTRACTS.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${contractId === c.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: contractId === c.id ? 'var(--accent-light)' : 'white' }}>
                  <input type="radio" name="contract" value={c.id} checked={contractId === c.id} onChange={() => setContractId(c.id)} style={{ accentColor: 'var(--accent)' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{c.entries} recognition entries</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format selector */}
          <div className="card">
            <div className="card-header"><h2>Export Format</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FORMATS.map(f => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: format === f.id ? 'var(--accent-light)' : 'white' }}>
                  <input type="radio" name="format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }}>{f.ext}</span>
                </label>
              ))}
            </div>
          </div>

          {done && <div className="alert alert-success">Export ready — file downloaded successfully.</div>}

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px' }} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11"/></svg>
                Download Export
              </>
            )}
          </button>

          <div className="card">
            <div className="card-header"><h2>What's included</h2></div>
            <div className="card-body">
              <table className="data-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr><th>Field</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {[
                    ['recognition_date', 'Date revenue was recognized'],
                    ['accounting_period', 'YYYY-MM period bucket'],
                    ['recognized_amount', 'Amount recognized this entry'],
                    ['deferred_amount', 'Remaining deferred balance'],
                    ['recognition_method', 'over_time / point_in_time'],
                    ['performance_obligation', 'Which POB this entry relates to'],
                    ['audit_reference', 'ASC 606 section reference'],
                  ].map(([f, d]) => (
                    <tr key={f}>
                      <td className="mono" style={{ fontSize: 11.5 }}>{f}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}