'use client';
import { useState } from 'react';

const MOCK = [
  { id: '1', customer_name: 'Acme Corporation', contract_number: 'CONTRACT-2024-001', total_contract_value: 240000, total_recognized: 122000, billing_type: 'subscription', start_date: '2024-01-01', end_date: '2025-12-31', status: 'active' },
  { id: '2', customer_name: 'Globex Systems', contract_number: 'CONTRACT-2024-002', total_contract_value: 96000, total_recognized: 48000, billing_type: 'usage_based', start_date: '2024-03-01', end_date: '2025-02-28', status: 'active' },
  { id: '3', customer_name: 'Initech Ltd', contract_number: 'CONTRACT-2023-018', total_contract_value: 55000, total_recognized: 55000, billing_type: 'fixed', start_date: '2023-06-01', end_date: '2024-05-31', status: 'completed' },
  { id: '4', customer_name: 'Umbrella Corp', contract_number: 'CONTRACT-2024-003', total_contract_value: 180000, total_recognized: 30000, billing_type: 'milestone', start_date: '2024-06-01', end_date: '2026-05-31', status: 'active' },
  { id: '5', customer_name: 'Stark Industries', contract_number: 'CONTRACT-2024-004', total_contract_value: 320000, total_recognized: 80000, billing_type: 'subscription', start_date: '2024-01-15', end_date: '2026-01-14', status: 'active' },
];

const billingBadge: Record<string, string> = {
  subscription: 'badge-blue',
  usage_based: 'badge-amber',
  fixed: 'badge-gray',
  milestone: 'badge-green',
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const filtered = MOCK.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h1>Contracts</h1>
        <p>All customer contracts and their recognition status</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <h2>{filtered.length} contracts</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="Search customer or contract #"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <a href="/upload" className="btn btn-primary">+ New Contract</a>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contract #</th>
                  <th>Billing Type</th>
                  <th>Period</th>
                  <th>Total Value</th>
                  <th>Recognized</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const pct = Math.round((c.total_recognized / c.total_contract_value) * 100);
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.customer_name}</td>
                      <td className="mono">{c.contract_number}</td>
                      <td><span className={`badge ${billingBadge[c.billing_type] || 'badge-gray'}`}>{c.billing_type.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.start_date} → {c.end_date}</td>
                      <td className="mono">${c.total_contract_value.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#16A34A' }}>${c.total_recognized.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 72, height: 4, background: '#F2F4F7', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#16A34A', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                          <span className={`status-dot ${c.status === 'active' ? 'green' : ''}`} />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}