'use client';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Mock data so the UI looks great even without a backend
const MOCK_PERIODS = [
  { accounting_period: '2024-01', total_recognized: 12000, total_deferred: 228000 },
  { accounting_period: '2024-02', total_recognized: 12000, total_deferred: 216000 },
  { accounting_period: '2024-03', total_recognized: 12000, total_deferred: 204000 },
  { accounting_period: '2024-04', total_recognized: 15000, total_deferred: 189000 },
  { accounting_period: '2024-05', total_recognized: 15000, total_deferred: 174000 },
  { accounting_period: '2024-06', total_recognized: 18000, total_deferred: 156000 },
  { accounting_period: '2024-07', total_recognized: 18000, total_deferred: 138000 },
  { accounting_period: '2024-08', total_recognized: 20000, total_deferred: 118000 },
];

const MOCK_CONTRACTS = [
  { id: '1', customer_name: 'Acme Corporation', contract_number: 'CONTRACT-2024-001', total_contract_value: 240000, total_recognized: 122000, status: 'active' },
  { id: '2', customer_name: 'Globex Systems', contract_number: 'CONTRACT-2024-002', total_contract_value: 96000, total_recognized: 48000, status: 'active' },
  { id: '3', customer_name: 'Initech Ltd', contract_number: 'CONTRACT-2023-018', total_contract_value: 55000, total_recognized: 55000, status: 'completed' },
  { id: '4', customer_name: 'Umbrella Corp', contract_number: 'CONTRACT-2024-003', total_contract_value: 180000, total_recognized: 30000, status: 'active' },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n}`;

export default function Dashboard() {
  const [periods] = useState(MOCK_PERIODS);
  const [contracts] = useState(MOCK_CONTRACTS);

  const totalRecognized = periods.reduce((s, p) => s + p.total_recognized, 0);
  const totalDeferred = periods[periods.length - 1]?.total_deferred ?? 0;
  const activeContracts = contracts.filter(c => c.status === 'active').length;

  const chartData = periods.map(p => ({
    period: p.accounting_period.slice(5), // "MM"
    Recognized: p.total_recognized,
    Deferred: p.total_deferred,
  }));

  return (
    <>
      <div className="page-header">
        <h1>Revenue Dashboard</h1>
        <p>ASC 606 recognized and deferred revenue overview</p>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Recognized</div>
            <div className="kpi-value green">{fmt(totalRecognized)}</div>
            <div className="kpi-delta">YTD 2024</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Deferred Revenue</div>
            <div className="kpi-value amber">{fmt(totalDeferred)}</div>
            <div className="kpi-delta">Remaining obligation</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active Contracts</div>
            <div className="kpi-value blue">{activeContracts}</div>
            <div className="kpi-delta">{contracts.length} total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Periods Tracked</div>
            <div className="kpi-value">{periods.length}</div>
            <div className="kpi-delta">Jan – Aug 2024</div>
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>Recognized vs Deferred Revenue</h2>
            <span className="badge badge-blue">2024</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRecognized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDeferred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={52} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #E4E7EC', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 8px rgba(0,0,0,0.06)' }}
                  formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="Recognized" stroke="#16A34A" strokeWidth={2} fill="url(#gRecognized)" dot={false} />
                <Area type="monotone" dataKey="Deferred" stroke="#D97706" strokeWidth={2} fill="url(#gDeferred)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Contracts</h2>
            <a href="/contracts" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>View all</a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contract #</th>
                  <th>Total Value</th>
                  <th>Recognized</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const pct = Math.round((c.total_recognized / c.total_contract_value) * 100);
                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.customer_name}</td>
                      <td className="mono">{c.contract_number}</td>
                      <td className="mono">${c.total_contract_value.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#16A34A' }}>${c.total_recognized.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#F2F4F7', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#16A34A', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{pct}%</span>
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