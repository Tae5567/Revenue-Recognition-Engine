'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const BASE = [10000,10000,10000,10500,10500,11000,11000,12000,12000,12000,12000,12000];
const EXTENDED = BASE.map(v => Math.round(v * 0.85));
const PRICE_UP = BASE.map(v => Math.round(v * 1.15));
const EARLY_TERM = BASE.map((v, i) => i < 8 ? Math.round(v * 1.1) : 0);

const SCENARIOS = [
  { id: 'base', label: 'Original Contract', data: BASE, color: '#1D4ED8', desc: '24-month subscription, $240K total' },
  { id: 'extended', label: 'Extended to 36 months', data: EXTENDED, color: '#16A34A', desc: 'Same value spread over longer period' },
  { id: 'price_up', label: 'Price increase +15%', data: PRICE_UP, color: '#D97706', desc: 'Cumulative catch-up adjustment applied' },
  { id: 'early_term', label: 'Early termination (month 8)', data: EARLY_TERM, color: '#B42318', desc: 'Recognition stops at contract end' },
];

export default function ScenariosPage() {
  const [active, setActive] = useState(['base', 'extended']);

  const toggle = (id: string) =>
    setActive(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const months = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, ...Object.fromEntries(SCENARIOS.map(s => [s.id, s.data[i]])) }));

  return (
    <>
      <div className="page-header">
        <h1>What-If Scenarios</h1>
        <p>Model revenue impact of contract changes before committing</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
          {/* Scenario selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  background: active.includes(s.id) ? 'white' : 'var(--bg)',
                  border: `1.5px solid ${active.includes(s.id) ? s.color : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  boxShadow: active.includes(s.id) ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.desc}</p>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <h2>Monthly Recognition Comparison</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click scenarios to toggle</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={months}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={44} />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #E4E7EC', borderRadius: 8, fontSize: 12 }} formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, '']} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    {SCENARIOS.filter(s => active.includes(s.id)).map(s => (
                      <Line key={s.id} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Delta table */}
            <div className="card">
              <div className="card-header"><h2>Total Recognition Comparison</h2></div>
              <table className="data-table">
                <thead>
                  <tr><th>Scenario</th><th>Total Recognized</th><th>vs Original</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {SCENARIOS.map(s => {
                    const total = s.data.reduce((a, b) => a + b, 0);
                    const base = BASE.reduce((a, b) => a + b, 0);
                    const delta = total - base;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</span>
                          </div>
                        </td>
                        <td className="mono">${total.toLocaleString()}</td>
                        <td className="mono" style={{ color: delta === 0 ? 'var(--text-muted)' : delta > 0 ? '#16A34A' : '#B42318' }}>
                          {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}$${delta.toLocaleString()}`}
                        </td>
                        <td><span className="badge badge-gray">ASC 606</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}