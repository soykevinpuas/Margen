import React from 'react';
import { useApp } from '../../context/AppContext';

interface MasViewProps {
  onOpenCompra: () => void;
  onOpenGasto: () => void;
  onOpenHistorialCompras: () => void;
  onOpenHistorialVentas: () => void;
  onOpenGastosOperativos: () => void;
  onOpenAjusteInventario: () => void;
  onOpenConfiguracion: () => void;
  onOpenLanding?: () => void;
}

export const MasView: React.FC<MasViewProps> = ({
  onOpenCompra,
  onOpenGasto,
  onOpenHistorialCompras,
  onOpenHistorialVentas,
  onOpenGastosOperativos,
  onOpenAjusteInventario,
  onOpenConfiguracion,
  onOpenLanding,
}) => {
  const { settings } = useApp();

  return (
    <div className="flex flex-col w-full p-4 gap-6 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-headline font-bold text-on-surface">
          Más Opciones
        </h2>
        <p className="text-xs text-on-surface-variant">
          Accede a historiales, registros de compras, gastos y configuración.
        </p>
      </div>

      {/* Operaciones / Registros */}
      <section className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
          Registros y Operaciones
        </span>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant/30 shadow-sm">
          <button
            onClick={onOpenCompra}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">local_mall</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">Agregar Compra</span>
                <span className="text-[10px] text-on-surface-variant">
                  Captura asistida con gastos de envío y costo real
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={onOpenGasto}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Registrar Gasto Operativo
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Renta, luz, servicios, nómina, publicidad
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={onOpenAjusteInventario}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-lg">fact_check</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Ajuste de Inventario
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Registrar merma, daño, pérdida o uso personal
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </section>

      {/* Consultas e Historiales */}
      <section className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
          Historiales y Consultas
        </span>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant/30 shadow-sm">
          <button
            onClick={onOpenHistorialVentas}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-lg">history</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Historial de Ventas
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Filtros por fecha, folios y cancelación
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={onOpenHistorialCompras}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-lg">inventory</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Historial de Compras (Lotes)
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Estatus de disponibilidad por lote
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={onOpenGastosOperativos}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-lg">
                  account_balance_wallet
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Gastos Operativos (Detalle)
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Desglose de egresos no COGS
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </section>

      {/* Configuración & Landing */}
      <section className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
          Ajustes y Presentación
        </span>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant/30 shadow-sm">
          {onOpenLanding && (
            <button
              onClick={onOpenLanding}
              className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-lg">web</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    Ver Landing Page
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Página informativa de presentación
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                chevron_right
              </span>
            </button>
          )}

          <button
            onClick={onOpenConfiguracion}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">settings</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Configuración del Negocio
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  {settings.businessName} • Moneda: {settings.displayCurrency} (T.C.{' '}
                  {settings.exchangeRate})
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
