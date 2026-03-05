'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/contracts',
    label: 'Contracts',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 1H3.5A1.5 1.5 0 002 2.5v11A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V6L9 1z"/>
        <path d="M9 1v5h5M5 9h6M5 12h4"/>
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Upload',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 10V3M5 6l3-3 3 3"/>
        <path d="M2 11v1.5A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5V11"/>
      </svg>
    ),
  },
  {
    href: '/schedules',
    label: 'Schedules',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1.5" y="3" width="13" height="12" rx="1.5"/>
        <path d="M1.5 7h13M5 1.5V4M11 1.5V4"/>
      </svg>
    ),
  },
  {
    href: '/scenarios',
    label: 'What-If',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12l4-4 3 3 5-7"/>
        <circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: '/audit',
    label: 'Audit Trail',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6.5" cy="6.5" r="4.5"/>
        <path d="M10 10l3.5 3.5"/>
        <path d="M5 6.5h3M6.5 5v3"/>
      </svg>
    ),
  },
  {
    href: '/export',
    label: 'Export',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2v8M5 7l3 3 3-3"/>
        <path d="M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>RevRec Engine</h1>
        <p>ASC 606 / IFRS 15</p>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">v1.0.0 · Standards Compliant</div>
    </aside>
  );
}