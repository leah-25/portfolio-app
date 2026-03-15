import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

// Map route → page title
const ROUTE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/holdings':  'Holdings',
  '/thesis':    'Thesis Journal',
  '/notes':     'Research Notes',
  '/rebalance': 'Rebalance Log',
  '/risk':      'Risk & Catalysts',
  '/settings':  'Settings',
};

export default function Shell() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  // Collapse sidebar by default on small screens
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title = ROUTE_TITLES[pathname] ?? 'Portfolio';

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 md:relative md:flex md:flex-shrink-0 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-surface-border px-4 md:hidden flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-overlay"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-text-primary">{title}</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
