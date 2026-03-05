'use client';
import { useState } from 'react';

const MOCK_AUDIT = [
  { id: '1', period: '2024-08', amount: 12000, contract: 'CONTRACT-2024-001', customer: 'Acme Corporation', method: 'over_time', pob: 'SaaS Platform License', steps: [
    { step: 1, desc: 'Contract identified', detail: 'CONTRACT-2024-001 · Acme Corporation' },
    { step: 2, desc: 'Performance obligations identified', detail: '3 POBs: License, Implementation, Support' },
    { step: 3, desc: 'Transaction price determined', detail: '$10,000 — fixed monthly invoice' },
    { step: 4, desc: 'Allocated by relative SSP', detail: 'License: 75% ($7,500) | Support: 12.5% ($1,250) | Impl: 12.5% ($1,250)' },
    { step: 5, desc: 'Recognized over time (straight-line)', detail: 'Days in period: 31/366 — $10,000 × 0.0847 = $847 proration applied' },
  ]},
  { id: '2', period: '2024-07', amount: 10000, contract: 'CONTRACT-2024-001', customer: 'Acme Corporation', method: 'over_time', pob: 'Support & Maintenance', steps: [
    { step: 1, desc: 'Contract identified', detail: 'CONTRACT-2024-001 · Acme Corporation' },
    { step: 2, desc: 'Performance obligations identified', detail: 'Support POB — satisfaction method: over_time' },
    { step: 3, desc: 'Transaction price determined', detail: '$1,250 allocated to this POB' },
    { step: 4, desc: 'Allocated by relative SSP', detail: 'Support SSP: $30,000 of $240,000 total = 12.5%' },
    { step: 5, desc: 'Recognized ratably', detail: 'Monthly recognition: $1,250 over 24 months' },
  ]},
  { id: '3', period: '2024-04', amount: 30000, contract: 'CONTRACT-2024-002', customer: 'Globex Systems', method: 'point_in_time', pob: 'Implementation Services', steps: [
    { step: 1, desc: 'Contract identified', detail: 'CONTRACT-2024-002 · Globex Systems' },
    { step: 2, desc: 'Performance obligation identified', detail: 'Implementation — distinct service, satisfied at a point in time' },
    { step: 3, desc: 'Transaction price determined', detail: '$30,000 — fixed fee upon go-live' },
    { step: 4, desc: 'No allocation needed', detail: 'Single performance obligation' },
    { step: 5, desc: 'Recognized at point in time', detail: 'Go-live confirmed April 15, 2024 — full $30,000 recognized' },
  ]},
];

export default function AuditPage() {
  const [selected, setSelected] = useState(MOCK_AUDIT[0]);

  return (
    <>
      <div className="page-header">
        <h1>Audit Trail</h1>
        <p>Full ASC 606 five-step reasoning for every recognition entry</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
          {/* Left list */}
          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header"><h2>Recognition Entries</h2></div>
            <div>
              {MOCK_AUDIT.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: selected.id === entry.id ? 'var(--accent-light)' : 'transparent',
                    border: 'none',
                    borderBottom: i < MOCK_AUDIT.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: selected.id === entry.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {entry.customer}
                      </p>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{entry.pob}</p>
                      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{entry.contract} · {entry.period}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>${entry.amount.toLocaleString()}</p>
                      <span className={`badge ${entry.method === 'over_time' ? 'badge-blue' : 'badge-amber'}`} style={{ marginTop: 4, fontSize: 10.5 }}>
                        {entry.method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right detail */}
          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header">
              <div>
                <h2>ASC 606 Five-Step Analysis</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selected.customer} · {selected.pob}</p>
              </div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: '#16A34A' }}>${selected.amount.toLocaleString()}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selected.steps.map((step, i) => (
                <div key={step.step} style={{ display: 'flex', gap: 12 }}>
                  {/* Step indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {step.step}
                    </div>
                    {i < selected.steps.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 16 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: i < selected.steps.length - 1 ? 12 : 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{step.desc}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{step.detail}</p>
                  </div>
                </div>
              ))}

              <hr className="divider" />

              <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Reference</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {selected.method === 'over_time'
                    ? 'ASC 606-10-25-27(b) — Revenue recognized over time as performance obligation is satisfied continuously.'
                    : 'ASC 606-10-25-30 — Revenue recognized at point in time when customer obtains control.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}