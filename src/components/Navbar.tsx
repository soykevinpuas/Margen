import React from 'react';

export type TabType = 'inicio' | 'inventario' | 'mas';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  variant?: 'sidebar' | 'bottom';
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
  { id: 'inventario', label: 'Inventario', icon: 'inventory_2' },
  { id: 'mas', label: 'Más', icon: 'more_horiz' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, variant }) => {
  const isSidebar = variant === 'sidebar';
  return (
    <>
      {/* Sidebar en desktop (lg+) */}
      <nav className={`${isSidebar ? 'hidden lg:flex' : 'hidden'} lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 z-40 bg-surface border-r border-outline-variant/30 p-4 gap-1`}>
        <div className="px-2 pb-4 mb-2 border-b border-outline-variant/30">
          <span className="text-lg font-extrabold text-primary">Margen</span>
        </div>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Barra inferior en móvil/tablet */}
      <nav className={`sticky bottom-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] ${isSidebar ? 'hidden' : 'lg:hidden'}`}>
        <div className="h-16 flex items-center justify-around px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                activeTab === t.id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
