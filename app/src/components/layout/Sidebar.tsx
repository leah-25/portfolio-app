import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',          label: 'Dashboard',   icon: '◈' },
  { to: '/holdings',  label: 'Holdings',    icon: '⬡' },
  { to: '/thesis',    label: 'Thesis',      icon: '◎' },
  { to: '/notes',     label: 'Notes',       icon: '▤' },
  { to: '/rebalance', label: 'Rebalance',   icon: '⇌' },
  { to: '/risk',      label: 'Risk',        icon: '◬' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={[
        'flex flex-col border-r border-surface-border bg-surface-raised transition-all duration-200',
        collapsed ? 'w-14' : 'w-52',
      ].join(' ')}
    >
      {/* Brand */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-surface-border flex-shrink-0">
        {!collapsed && (
          <span className="text-sm font-semibold text-text-primary tracking-tight truncate">
            10x Portfolio
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-overlay hover:text-text-primary transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-subtle text-text-primary'
                  : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary',
              ].join(' ')
            }
          >
            <span className="text-base leading-none flex-shrink-0" aria-hidden>
              {icon}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings link — bottom */}
      <div className="border-t border-surface-border px-2 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-subtle text-text-primary'
                : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary',
            ].join(' ')
          }
        >
          <span className="text-base leading-none flex-shrink-0" aria-hidden>
            ⚙
          </span>
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
