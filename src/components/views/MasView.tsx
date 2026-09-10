import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExportExcelModal } from '../modals/ExportExcelModal';
import { GastoHistoricoModal } from '../modals/GastoHistoricoModal';
import { GananciasHistoricasModal } from '../modals/GananciasHistoricasModal';
import { CompartirAmigoModal } from '../modals/CompartirAmigoModal';

interface MasViewProps {
  onOpenCompra: () => void;
  onOpenGasto: () => void;
  onOpenHistorialCompras: () => void;
  onOpenHistorialVentas: () => void;
  onOpenGastosOperativos: () => void;
  onOpenAjusteInventario: () => void;
  onOpenConfiguracion: () => void;
  onOpenLanding?: () => void;
  onOpenGastoHistorico?: () => void;
  onOpenGananciasHistoricas?: () => void;
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
  onOpenGastoHistorico,
  onOpenGananciasHistoricas,
}) => {
  const { settings } = useApp();
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isGastoHistoricoOpen, setIsGastoHistoricoOpen] = useState(false);
  const [isGananciasHistoricasOpen, setIsGananciasHistoricasOpen] = useState(false);
  const [isCompartirOpen, setIsCompartirOpen] = useState(false);

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
                  Desglose de egresos operativos
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={() => setIsExcelOpen(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left bg-emerald-500/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-lg">description</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  Exportar a Excel (.xlsx)
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-md">OFICIAL</span>
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Descargar resumen del mes, ventas e inventario con columnas personalizadas
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-lg">
              download
            </span>
          </button>

          <button
            onClick={() => {
              if (onOpenGastoHistorico) onOpenGastoHistorico();
              else setIsGastoHistoricoOpen(true);
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Gasto Histórico
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Detalle y acumulado real de todos los egresos y costos de mercancía
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>

          <button
            onClick={() => {
              if (onOpenGananciasHistoricas) onOpenGananciasHistoricas();
              else setIsGananciasHistoricasOpen(true);
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-lg">trending_up</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Ganancias Históricas
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Utilidad neta real libre y balance mes a mes
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              chevron_right
            </span>
          </button>
        </div>
      </section>

      {/* Configuración y Difusión */}
      <section className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
          Ajustes y Difusión
        </span>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant/30 shadow-sm">
          <button
            onClick={() => setIsCompartirOpen(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-surface-container-high transition-colors text-left bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">qr_code_2</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  Compartir con un Amigo
                  <span className="px-1.5 py-0.2 bg-primary/20 text-primary text-[9px] font-bold rounded-md">QR</span>
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Genera un código QR y enlace directo a la app/landing
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary text-lg">
              chevron_right
            </span>
          </button>

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

      <ExportExcelModal
        isOpen={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
      />

      <GastoHistoricoModal
        isOpen={isGastoHistoricoOpen}
        onClose={() => setIsGastoHistoricoOpen(false)}
      />

      <GananciasHistoricasModal
        isOpen={isGananciasHistoricasOpen}
        onClose={() => setIsGananciasHistoricasOpen(false)}
      />

      <CompartirAmigoModal
        isOpen={isCompartirOpen}
        onClose={() => setIsCompartirOpen(false)}
        onOpenLanding={onOpenLanding}
      />
    </div>
  );
};
