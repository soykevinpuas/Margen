import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney } from '../../utils/calculations';

export type TicketOperationType = 'venta' | 'compra' | 'gasto';

/** Renglón del ticket: usa `amount` (monto en MXN) o `text` (texto libre) */
export interface TicketLineItem {
  label: string;
  amount?: number;
  text?: string;
  bold?: boolean;
}

/** Metadatos secundarios (método, proveedor, categoría, margen, etc.) */
export interface TicketMetaEntry {
  label: string;
  value: string;
}

interface TicketModalProps {
  isOpen: boolean;
  type: TicketOperationType;
  title: string;
  subtitle?: string;
  folio?: string;
  fecha?: string;
  lines?: TicketLineItem[];
  totalLabel?: string;
  totalAmount?: number;
  totalText?: string;
  meta?: TicketMetaEntry[];
  notas?: string;
  /** Botón principal (secundario visualmente secundario) */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Botón secundario: historial correspondiente */
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
}

const TICKET_LABELS: Record<
  TicketOperationType,
  { type: string; primary: string; secondary: string; primaryIcon: string; secondaryIcon: string }
> = {
  venta: {
    type: 'Ticket de Venta',
    primary: 'Nueva Venta',
    secondary: 'Historial Ventas',
    primaryIcon: 'add_circle',
    secondaryIcon: 'history',
  },
  compra: {
    type: 'Ticket de Compra',
    primary: 'Nueva Compra',
    secondary: 'Historial Compras',
    primaryIcon: 'add_shopping_cart',
    secondaryIcon: 'inventory',
  },
  gasto: {
    type: 'Ticket de Gasto',
    primary: 'Nuevo Gasto',
    secondary: 'Historial de Gastos',
    primaryIcon: 'receipt_long',
    secondaryIcon: 'account_balance_wallet',
  },
};

/**
 * Ticket tipo recibo (bordes dashed, tipografía mono) para confirmar
 * la operación recién registrada: venta, compra o gasto.
 */
export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  type,
  title,
  subtitle,
  folio,
  fecha,
  lines = [],
  totalLabel = 'Total',
  totalAmount,
  totalText,
  meta = [],
  notas,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}) => {
  const { settings } = useApp();
  const { displayCurrency, exchangeRate } = settings;

  if (!isOpen) return null;

  const labels = TICKET_LABELS[type];
  const fmt = (amount: number) => formatMoney(amount, displayCurrency, exchangeRate);

  const fechaLabel = (() => {
    if (!fecha) return new Date().toLocaleString('es-MX');
    const d = new Date(fecha.length === 10 ? `${fecha}T00:00:00` : fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm max-h-[92vh] flex flex-col bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-headline font-bold text-on-surface truncate">{title}</h2>
              {subtitle && (
                <p className="text-[10px] text-on-surface-variant truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ticket"
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Ticket / Receipt */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl p-4 font-mono text-on-surface shadow-inner">
            {/* Encabezado del ticket */}
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] truncate">
                {settings.businessName || 'Margen'}
              </p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">
                {labels.type}
              </p>
            </div>

            <div className="my-3 border-t border-dashed border-outline-variant" />

            <div className="space-y-1 text-[10px] text-on-surface-variant">
              <div className="flex justify-between gap-3">
                <span>Folio</span>
                <span className="font-bold text-on-surface">{folio || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Fecha</span>
                <span className="text-on-surface text-right">{fechaLabel}</span>
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-outline-variant" />

            {/* Conceptos / renglones con monto */}
            <div className="space-y-1.5">
              {lines.map((line, idx) => (
                <div
                  key={`${line.label}-${idx}`}
                  className={`flex justify-between gap-3 text-[11px] ${
                    line.bold ? 'font-bold' : ''
                  }`}
                >
                  <span className={`min-w-0 break-words ${line.bold ? 'uppercase' : ''}`}>
                    {line.label}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {line.amount !== undefined ? fmt(line.amount) : (line.text ?? '—')}
                  </span>
                </div>
              ))}
              {lines.length === 0 && (
                <p className="text-[11px] text-on-surface-variant italic text-center">
                  Sin conceptos registrados
                </p>
              )}
            </div>

            {/* Metadatos (método, categoría, margen, etc.) */}
            {meta.length > 0 && (
              <>
                <div className="my-3 border-t border-dashed border-outline-variant" />
                <div className="space-y-1 text-[10px] text-on-surface-variant">
                  {meta.map((entry, idx) => (
                    <div
                      key={`${entry.label}-${idx}`}
                      className="flex justify-between gap-3 items-start"
                    >
                      <span className="shrink-0">{entry.label}</span>
                      <span className="text-on-surface font-bold text-right break-words">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Total */}
            <div className="my-3 border-t-2 border-dashed border-outline-variant" />
            <div className="flex justify-between items-center gap-3">
              <span className="text-xs font-extrabold uppercase">{totalLabel}</span>
              <span className="text-lg font-extrabold tabular-nums text-right">
                {totalAmount !== undefined ? fmt(totalAmount) : (totalText ?? '—')}
              </span>
            </div>

            {notas && (
              <p className="mt-3 text-[10px] italic text-on-surface-variant break-words">
                Nota: {notas}
              </p>
            )}

            <div className="my-3 border-t border-dashed border-outline-variant" />
            <p className="text-center text-[9px] text-on-surface-variant uppercase tracking-widest">
              Gracias por usar Margen
            </p>
          </div>
        </div>

        {/* Acciones del ticket */}
        {(onSecondary || onPrimary) && (
          <div className="px-4 pb-4 pt-1 flex flex-col sm:flex-row gap-2 border-t border-outline-variant/40 shrink-0">
            {onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="flex-1 py-2.5 px-3 bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-variant transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {labels.secondaryIcon}
                </span>
                {secondaryLabel || labels.secondary}
              </button>
            )}

            {onPrimary && (
              <button
                type="button"
                onClick={onPrimary}
                className="flex-1 py-2.5 px-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {labels.primaryIcon}
                </span>
                {primaryLabel || labels.primary}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
