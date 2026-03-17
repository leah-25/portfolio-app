import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  FileText,
  BookOpen,
  ArrowLeftRight,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',          label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/holdings',  label: 'Holdings',   Icon: Layers },
  { to: '/thesis',    label: 'Thesis',     Icon: FileText },
  { to: '/notes',     label: 'Notes',      Icon: BookOpen },
  { to: '/rebalance', label: 'Rebalance',  Icon: ArrowLeftRight },
  { to: '/risk',      label: 'Risk',       Icon: ShieldAlert },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, onClose }: SidebarProps) {
  return (
    <aside
      className={[
        'flex h-full flex-col bg-surface-raised border-r border-surface-border transition-[width] duration-200 ease-out overflow-hidden',
        collapsed ? 'w-[56px]' : 'w-[220px]',
      ].join(' ')}
    >
      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className={[
        'flex h-14 items-center border-b border-surface-border flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'px-4 gap-2.5',
      ].join(' ')}>
        {/* Logo mark */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
          <TrendingUp size={14} className="text-accent" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary leading-none tracking-tight">
              10x Portfolio
            </div>
          </div>
        )}
        {/* Mobile close button (only on mobile) */}
        {!collapsed && (
          <button
            onClick={onClose}
            className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary md:hidden"
            aria-label="Close navigation"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 rounded-md transition-colors duration-100',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                isActive
                  ? 'bg-accent-subtle text-text-primary'
                  : 'text-text-muted hover:bg-surface-overlay hover:text-text-secondary',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-accent" />
                )}
                <Icon
                  size={16}
                  className={[
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary',
                  ].join(' ')}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {!collapsed && (
                  <span className={[
                    'text-sm font-medium truncate',
                    isActive ? 'text-text-primary' : '',
                  ].join(' ')}>
                    {label}
                  </span>
                )}
                {/* Collapsed tooltip */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
                    <div className="rounded-md bg-surface-overlay border border-surface-border px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-card-md whitespace-nowrap">
                      {label}
                    </div>
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom: Settings + Collapse toggle ────────────────────────────── */}
      <div className="border-t border-surface-border px-2 py-2 space-y-0.5 flex-shrink-0">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'group relative flex items-center gap-3 rounded-md transition-colors duration-100',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
              isActive
                ? 'bg-accent-subtle text-text-primary'
                : 'text-text-muted hover:bg-surface-overlay hover:text-text-secondary',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-accent" />
              )}
              <Settings
                size={16}
                className={[
                  'flex-shrink-0',
                  isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary',
                ].join(' ')}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && (
                <span className="text-sm font-medium">Settings</span>
              )}
              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
                  <div className="rounded-md bg-surface-overlay border border-surface-border px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-card-md whitespace-nowrap">
                    Settings
                  </div>
                </div>
              )}
            </>
          )}
        </NavLink>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggle}
          className={[
            'hidden md:flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-text-muted hover:bg-surface-overlay hover:text-text-secondary transition-colors',
            collapsed ? 'justify-center px-0' : '',
          ].join(' ')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={16} strokeWidth={2} />
            : (
              <>
                <ChevronLeft size={16} strokeWidth={2} className="flex-shrink-0" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}
