interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-overlay p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active === tab.key
              ? 'bg-surface-raised text-text-primary shadow-card'
              : 'text-text-muted hover:text-text-secondary',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
