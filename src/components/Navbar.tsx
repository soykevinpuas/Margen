import React from 'react';

export type TabType = 'inicio' | 'inventario' | 'vender' | 'graficas' | 'mas';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="sticky bottom-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="h-16 flex items-center justify-around px-2">
        {/* Inicio */}
        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
            activeTab === 'inicio' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="text-[10px] font-medium">Inicio</span>
        </button>

        {/* Inventario */}
        <button
          onClick={() => setActiveTab('inventario')}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
            activeTab === 'inventario' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          <span className="text-[10px] font-medium">Inventario</span>
        </button>

        {/* Vender (Primary action highlight) */}
        <button
          onClick={() => setActiveTab('vender')}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
            activeTab === 'vender' ? 'text-primary font-bold' : 'text-primary/80 hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[26px] font-bold">add_circle</span>
          <span className="text-[10px] font-bold">Vender</span>
        </button>

        {/* Gráficas */}
        <button
          onClick={() => setActiveTab('graficas')}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
            activeTab === 'graficas' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">monitoring</span>
          <span className="text-[10px] font-medium">Gráficas</span>
        </button>

        {/* Más */}
        <button
          onClick={() => setActiveTab('mas')}
          className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
            activeTab === 'mas' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">more_horiz</span>
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
};
