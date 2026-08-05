import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { InicioView } from './components/views/InicioView';
import { InventarioView } from './components/views/InventarioView';
import { VenderView } from './components/views/VenderView';
import { GraficasView } from './components/views/GraficasView';
import { MasView } from './components/views/MasView';
import { LandingPage } from './components/views/LandingPage';
import { useAuth } from './context/AuthContext';

// Modals
import { NuevaCompraModal } from './components/modals/NuevaCompraModal';
import { NuevoGastoModal } from './components/modals/NuevoGastoModal';
import { DetalleProductoModal } from './components/modals/DetalleProductoModal';
import { HistorialVentasModal } from './components/modals/HistorialVentasModal';
import { HistorialComprasModal } from './components/modals/HistorialComprasModal';
import { GastosOperativosModal } from './components/modals/GastosOperativosModal';
import { AjusteInventarioModal } from './components/modals/AjusteInventarioModal';
import { NuevoProductoModal } from './components/modals/NuevoProductoModal';
import { ConfiguracionModal } from './components/modals/ConfiguracionModal';
import { AuthModal } from './components/modals/AuthModal';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('app');
  const [activeTab, setActiveTab] = useState<TabType>('inicio');

  // Modal States
  const [isCompraOpen, setIsCompraOpen] = useState(false);
  const [isGastoOpen, setIsGastoOpen] = useState(false);
  const [isHistorialComprasOpen, setIsHistorialComprasOpen] = useState(false);
  const [isHistorialVentasOpen, setIsHistorialVentasOpen] = useState(false);
  const [isGastosOperativosOpen, setIsGastosOperativosOpen] = useState(false);
  const [isAjusteInventarioOpen, setIsAjusteInventarioOpen] = useState(false);
  const [isConfiguracionOpen, setIsConfiguracionOpen] = useState(false);
  const [isNuevoProductoOpen, setIsNuevoProductoOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Selected entities for detail / edit
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [preselectedProductForSale, setPreselectedProductForSale] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const tabTitles: Record<TabType, string> = {
    inicio: 'Inicio',
    inventario: 'Inventario',
    vender: 'Vender',
    graficas: 'Gráficas & Reportes',
    mas: 'Más Opciones',
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
  };

  const handleOpenEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setSelectedProductId(null);
    setIsNuevoProductoOpen(true);
  };

  const handleOpenNewBatchForProduct = (productId: string) => {
    setSelectedProductId(null);
    setIsCompraOpen(true);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 animate-bounce">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-extrabold text-emerald-400 text-lg">
            %
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400">Cargando Margen...</p>
      </div>
    );
  }

  // 2. Unauthenticated Flow: Require Auth to enter app
  if (!user) {
    return (
      <>
        <LandingPage
          onEnterApp={() => setIsAuthOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </>
    );
  }

  // 3. Authenticated Flow (User is logged in)
  // If user actively toggles landing view mode from menu:
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          onEnterApp={() => setViewMode('app')}
          onOpenAuth={() => setViewMode('app')}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col items-center justify-start antialiased selection:bg-primary selection:text-on-primary">
      {/* Mobile Shell Frame max width on desktop for responsive elegance */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-surface border-x border-outline-variant/30 shadow-2xl">
        {/* Top Sticky Header */}
        <Header
          currentTabTitle={tabTitles[activeTab]}
          onOpenSettings={() => setIsConfiguracionOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenLanding={() => setViewMode('landing')}
        />

        {/* Main View Area */}
        <main className="flex-1 pb-6">
          {activeTab === 'inicio' && (
            <InicioView
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenCompra={() => setIsCompraOpen(true)}
              onOpenGasto={() => setIsGastoOpen(true)}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {activeTab === 'inventario' && (
            <InventarioView
              onSelectProduct={handleSelectProduct}
              onOpenNuevoProducto={() => {
                setEditingProductId(null);
                setIsNuevoProductoOpen(true);
              }}
              onOpenCompra={() => setIsCompraOpen(true)}
            />
          )}

          {activeTab === 'vender' && (
            <VenderView
              preselectedProductId={preselectedProductForSale}
              onSaleSuccess={() => {
                setPreselectedProductForSale(null);
              }}
              onGoToHistory={() => {
                setIsHistorialVentasOpen(true);
              }}
              onOpenNuevoProducto={() => {
                setEditingProductId(null);
                setIsNuevoProductoOpen(true);
              }}
            />
          )}

          {activeTab === 'graficas' && <GraficasView />}

          {activeTab === 'mas' && (
            <MasView
              onOpenCompra={() => setIsCompraOpen(true)}
              onOpenGasto={() => setIsGastoOpen(true)}
              onOpenHistorialCompras={() => setIsHistorialComprasOpen(true)}
              onOpenHistorialVentas={() => setIsHistorialVentasOpen(true)}
              onOpenGastosOperativos={() => setIsGastosOperativosOpen(true)}
              onOpenAjusteInventario={() => setIsAjusteInventarioOpen(true)}
              onOpenConfiguracion={() => setIsConfiguracionOpen(true)}
              onOpenLanding={() => setViewMode('landing')}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* MODALS */}
      <NuevaCompraModal
        isOpen={isCompraOpen}
        onClose={() => setIsCompraOpen(false)}
        onOpenNuevoProducto={() => {
          setEditingProductId(null);
          setIsNuevoProductoOpen(true);
        }}
      />

      <NuevoGastoModal
        isOpen={isGastoOpen}
        onClose={() => setIsGastoOpen(false)}
      />

      <DetalleProductoModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onOpenEditProduct={handleOpenEditProduct}
        onOpenNewBatchForProduct={handleOpenNewBatchForProduct}
      />

      <HistorialVentasModal
        isOpen={isHistorialVentasOpen}
        onClose={() => setIsHistorialVentasOpen(false)}
      />

      <HistorialComprasModal
        isOpen={isHistorialComprasOpen}
        onClose={() => setIsHistorialComprasOpen(false)}
      />

      <GastosOperativosModal
        isOpen={isGastosOperativosOpen}
        onClose={() => setIsGastosOperativosOpen(false)}
      />

      <AjusteInventarioModal
        isOpen={isAjusteInventarioOpen}
        onClose={() => setIsAjusteInventarioOpen(false)}
      />

      <NuevoProductoModal
        isOpen={isNuevoProductoOpen}
        onClose={() => {
          setIsNuevoProductoOpen(false);
          setEditingProductId(null);
        }}
        editingProductId={editingProductId}
      />

      <ConfiguracionModal
        isOpen={isConfiguracionOpen}
        onClose={() => setIsConfiguracionOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};

export default AppContent;
