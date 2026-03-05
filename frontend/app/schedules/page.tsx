'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOCK_SCHEDULE = Array.from({ length: 12 }, (_, i) => {
  const month = String(i + 1).padStart(2, '0');
  const base = 10000 + Math.random() * 4000;
  return {
    period: `2024-${month}`,
    recognized: Math.round(base),
    deferred: Math.round(228000 - base * (i + 1)),
    entries: Math.floor(3 + Math.random() * 5),
    method: i < 6 ? 'over_time' : 'prorated',
  };
});

export default function SchedulesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRow = MOCK_SCHEDULE.find(r => r.period === selected);

  return (
    <>
      <div className="page-header">
        <h1>Recognition Schedules</h1>
        <p>Monthly revenue recognition breakdown by contract and period</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <h2>Monthly Recognition — Acme Corporation</h2>
                <span className="badge badge-blue">CONTRACT-2024-001</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_SCHEDULE} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={44} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E4E7EC', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, 'Recognized']}
                    />
                    <Bar dataKey="recognized" radius={[4, 4, 0, 0]} onClick={(d) => setSelected(d.payload.period)}>
                      {MOCK_SCHEDULE.map((entry) => (
                        <Cell key={entry.period} fill={entry.period === selected ? '#1D4ED8' : '#93C5FD'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Recognition Entries</h2></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Recognized</th>
                      <th>Deferred</th>
                      <th>Method</th>
                      <th>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_SCHEDULE.map(row => (
                      <tr key={row.period} style={{ cursor: 'pointer', background: row.period === selected ? 'var(--accent-light)' : '' }} onClick={() => setSelected(row.period)}>
                        <td className="mono" style={{ fontWeight: 500 }}>{row.period}</td>
                        <td className="mono" style={{ color: '#16A34A' }}>${row.recognized.toLocaleString()}</td>
                        <td className="mono" style={{ color: '#D97706' }}>${Math.max(row.deferred, 0).toLocaleString()}</td>
                        <td><span className="badge badge-gray">{row.method}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.entries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><h2>Period Detail</h2></div>
              <div className="card-body">
                {selectedRow ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 650, fontFamily: 'DM Mono, monospace', color: '#16A34A', letterSpacing: '-0.04em' }}>
                        ${selectedRow.recognized.toLocaleString()}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Recognized in {selectedRow.period}</p>
                    </div>
                    <hr className="divider" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        ['Period', selectedRow.period],
                        ['Method', selectedRow.method],
                        ['Deferred Balance', `$${Math.max(selectedRow.deferred, 0).toLocaleString()}`],
                        ['Journal Entries', String(selectedRow.entries)],
                        ['Standard', 'ASC 606-10-25'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                          <span style={{ fontWeight: 500, fontFamily: k === 'Period' || k === 'Deferred Balance' ? 'DM Mono, monospace' : 'inherit', fontSize: k === 'Period' ? 12 : 13 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <a href="/audit" className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12 }}>View Audit Trail</a>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    <p style={{ fontSize: 13 }}>Click a period to see detail</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Summary</h2></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Total Recognized', `$${MOCK_SCHEDULE.reduce((s, r) => s + r.recognized, 0).toLocaleString()}`, '#16A34A'],
                  ['Current Deferred', `$${Math.max(MOCK_SCHEDULE[MOCK_SCHEDULE.length - 1].deferred, 0).toLocaleString()}`, '#D97706'],
                  ['Total Periods', '12', 'var(--text-primary)'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}