import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ShellContext } from './ShellContext';

export default function Shell() {
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMobileOpen(false);
  }, [pathname]);

  const openMobileNav = useCallback(() => setMobileOpen(true), []);

  return (
    <ShellContext.Provider value={{ openMobileNav }}>
      <div className="flex h-screen overflow-hidden bg-surface">

        {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        {/* Desktop: inline; Mobile: fixed overlay */}
        <div
          className={[
            // Mobile: fixed drawer from left
            'fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            // Desktop: inline flex, always visible, no translation
            'md:relative md:flex md:flex-shrink-0 md:translate-x-0',
          ].join(' ')}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
            onClose={() => setMobileOpen(false)}
          />
        </div>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

      </div>
    </ShellContext.Provider>
  );
}
