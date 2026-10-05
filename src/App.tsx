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
import { useApp } from './context/AppContext';

// Modals
import { NuevaCompraModal } from './components/modals/NuevaCompraModal';
import { NuevoGastoModal } from './components/modals/NuevoGastoModal';
import { DetalleProductoModal } from './components/modals/DetalleProductoModal';
import { HistorialVentasModal } from './components/modals/HistorialVentasModal';
import { HistorialComprasModal } from './components/modals/HistorialComprasModal';
import { GastosOperativosModal } from './components/modals/GastosOperativosModal';
import { GastoHistoricoModal } from './components/modals/GastoHistoricoModal';
import { AjusteInventarioModal } from './components/modals/AjusteInventarioModal';
import { NuevoProductoModal } from './components/modals/NuevoProductoModal';
import { ConfiguracionModal } from './components/modals/ConfiguracionModal';
import { AuthModal } from './components/modals/AuthModal';
import {
  EditarRegistroModal,
  EditRecordHandler,
  EditableRecord,
  EditableRecordType,
} from './components/modals/EditarRegistroModal';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { businessLoading } = useApp();
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('app');
  const [activeTab, setActiveTab] = useState<TabType>('inicio');

  // Modal States
  const [isCompraOpen, setIsCompraOpen] = useState(false);
  const [preselectedCompraProduct, setPreselectedCompraProduct] = useState<string | null>(null);
  const [isGastoOpen, setIsGastoOpen] = useState(false);
  const [isHistorialComprasOpen, setIsHistorialComprasOpen] = useState(false);
  const [isHistorialVentasOpen, setIsHistorialVentasOpen] = useState(false);
  const [isGastosOperativosOpen, setIsGastosOperativosOpen] = useState(false);
  const [isGastoHistoricoOpen, setIsGastoHistoricoOpen] = useState(false);
  const [isAjusteInventarioOpen, setIsAjusteInventarioOpen] = useState(false);
  const [isConfiguracionOpen, setIsConfiguracionOpen] = useState(false);
  const [isNuevoProductoOpen, setIsNuevoProductoOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Selected entities for detail / edit
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [preselectedProductForSale, setPreselectedProductForSale] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Edición genérica de registros (venta / lote / gasto) desde cualquier card de historial
  const [editState, setEditState] = useState<{
    open: boolean;
    type: EditableRecordType;
    recordId: string;
    record: EditableRecord | null;
  }>({ open: false, type: 'venta', recordId: '', record: null });

  /** Monta el modal EditarRegistroModal con el registro seleccionado */
  const editRecord: EditRecordHandler = (type, record) => {
    setEditState({ open: true, type, recordId: record.id, record });
  };

  const tabTitles: Record<TabType, string> = {
    inicio: 'Inicio',
    inventario: 'Inventario',
    mas: 'Más Opciones',
  };

  const [overlayView, setOverlayView] = useState<'vender' | 'graficas' | null>(null);

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

  /** Abre el overlay de Venta con un producto preseleccionado (desde Inventario / detalle) */
  const handleOpenVenderConProducto = (productId: string | null) => {
    setSelectedProductId(null);
    setPreselectedProductForSale(productId);
    setOverlayView('vender');
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-0.5 animate-bounce">
          <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center font-extrabold text-primary text-lg">
            %
          </div>
        </div>
        <p className="text-xs font-semibold text-on-surface-variant">Cargando Margen...</p>
      </div>
    );
  }

  // 1.5. Business Loading State (switching business / first load)
  if (user && businessLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-0.5 animate-bounce">
          <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center font-extrabold text-primary text-lg">
            %
          </div>
        </div>
        <p className="text-xs font-semibold text-on-surface-variant">Cargando negocio...</p>
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
        />

        {/* Main View Area */}
        <main className="flex-1 pb-6">
          {overlayView === null && activeTab === 'inicio' && (
            <InicioView
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenVender={(pid) => handleOpenVenderConProducto(pid ?? null)}
              onOpenGraficas={() => setOverlayView('graficas')}
              onOpenCompra={(pid) => { setPreselectedCompraProduct(pid ?? null); setIsCompraOpen(true); }}
              onOpenGasto={() => setIsGastoOpen(true)}
              onSelectProduct={handleSelectProduct}
              onEdit={editRecord}
            />
          )}

          {overlayView === null && activeTab === 'inventario' && (
            <InventarioView
              onSelectProduct={handleSelectProduct}
              onOpenNuevoProducto={() => {
                setEditingProductId(null);
                setIsNuevoProductoOpen(true);
              }}
              onOpenCompra={(pid) => { setPreselectedCompraProduct(pid ?? null); setIsCompraOpen(true); }}
              onOpenVender={(pid) => handleOpenVenderConProducto(pid)}
              onEdit={editRecord}
            />
          )}

          {overlayView === 'vender' && (
            <div className="flex flex-col">
              <div className="p-2">
                <button
                  onClick={() => setOverlayView(null)}
                  className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Volver
                </button>
              </div>
              <VenderView
                preselectedProductId={preselectedProductForSale}
                onSaleSuccess={() => {
                  setPreselectedProductForSale(null);
                }}
                onGoToHistory={() => {
                  setOverlayView(null);
                  setIsHistorialVentasOpen(true);
                }}
                onOpenNuevoProducto={() => {
                  setEditingProductId(null);
                  setIsNuevoProductoOpen(true);
                }}
                onCloseVender={() => {
                  setOverlayView(null);
                  setPreselectedProductForSale(null);
                }}
                onEdit={editRecord}
              />
            </div>
          )}

          {overlayView === 'graficas' && (
            <div className="flex flex-col">
              <div className="p-2">
                <button
                  onClick={() => setOverlayView(null)}
                  className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Volver
                </button>
              </div>
              <GraficasView />
            </div>
          )}

          {overlayView === null && activeTab === 'mas' && (
            <MasView
              onOpenCompra={(pid) => { setPreselectedCompraProduct(pid ?? null); setIsCompraOpen(true); }}
              onOpenGasto={() => setIsGastoOpen(true)}
              onOpenHistorialCompras={() => setIsHistorialComprasOpen(true)}
              onOpenHistorialVentas={() => setIsHistorialVentasOpen(true)}
              onOpenGastosOperativos={() => setIsGastosOperativosOpen(true)}
              onOpenGastoHistorico={() => setIsGastoHistoricoOpen(true)}
              onOpenAjusteInventario={() => setIsAjusteInventarioOpen(true)}
              onOpenConfiguracion={() => setIsConfiguracionOpen(true)}
              onOpenGraficas={() => setOverlayView('graficas')}
              onEdit={editRecord}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* MODALS */}
      <NuevaCompraModal
        preselectedProductId={preselectedCompraProduct}
        isOpen={isCompraOpen}
        onClose={() => setIsCompraOpen(false)}
        onOpenNuevoProducto={() => {
          setEditingProductId(null);
          setIsNuevoProductoOpen(true);
        }}
        onViewHistorial={() => setIsHistorialComprasOpen(true)}
      />

      <NuevoGastoModal
        isOpen={isGastoOpen}
        onClose={() => setIsGastoOpen(false)}
        onViewHistorial={() => setIsGastoHistoricoOpen(true)}
      />

      <DetalleProductoModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onOpenEditProduct={handleOpenEditProduct}
        onOpenNewBatchForProduct={handleOpenNewBatchForProduct}
        onOpenVender={(pid) => handleOpenVenderConProducto(pid)}
      />

      <HistorialVentasModal
        isOpen={isHistorialVentasOpen}
        onClose={() => setIsHistorialVentasOpen(false)}
        onEdit={editRecord}
      />

      <HistorialComprasModal
        isOpen={isHistorialComprasOpen}
        onClose={() => setIsHistorialComprasOpen(false)}
        onEdit={editRecord}
      />

      <GastosOperativosModal
        isOpen={isGastosOperativosOpen}
        onClose={() => setIsGastosOperativosOpen(false)}
        onEdit={editRecord}
      />

      <GastoHistoricoModal
        isOpen={isGastoHistoricoOpen}
        onClose={() => setIsGastoHistoricoOpen(false)}
        onEdit={editRecord}
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

      {/* Edición genérica de registros (venta / lote / gasto) */}
      <EditarRegistroModal
        isOpen={editState.open}
        type={editState.type}
        record={editState.record}
        recordId={editState.recordId}
        onClose={() => setEditState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default AppContent;
