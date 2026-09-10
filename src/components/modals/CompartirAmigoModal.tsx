import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';

interface CompartirAmigoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLanding?: () => void;
}

export const CompartirAmigoModal: React.FC<CompartirAmigoModalProps> = ({
  isOpen,
  onClose,
  onOpenLanding,
}) => {
  const { settings } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.href.split('#')[0].split('?')[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.businessName || 'MARGEN',
          text: `¡Te comparto la app de ${settings.businessName || 'MARGEN'}! Gestiona inventarios, ventas y calcula ganancias reales con margen exacto.`,
          url: appUrl,
        });
      } catch (err) {
        console.log('Compartir cancelado o no soportado:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-sm rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-xl">qr_code_2</span>
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">
                Compartir con un Amigo
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Invita o comparte {settings.businessName || 'tu app'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center gap-4 text-center">
          {/* QR Container - Clean White Background for effortless scanning */}
          <div className="p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-lg flex flex-col items-center justify-center relative group">
            <QRCodeSVG
              value={appUrl}
              size={180}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
            <div className="mt-2 text-[10px] font-bold tracking-wider text-slate-700 uppercase">
              {settings.businessName || 'MARGEN'}
            </div>
          </div>

          <div className="flex flex-col gap-1 max-w-xs">
            <p className="text-xs font-bold text-on-surface">
              Escanea el código QR con tu celular
            </p>
            <p className="text-[11px] text-on-surface-variant leading-tight">
              O comparte el enlace a la página para que tu amigo pueda acceder a la landing page y usar la app.
            </p>
          </div>

          {/* Link Box */}
          <div className="w-full p-2.5 bg-surface-container border border-outline-variant rounded-xl flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="material-symbols-outlined text-primary text-base shrink-0">
                link
              </span>
              <span className="text-[11px] font-mono text-on-surface truncate select-all">
                {appUrl}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant bg-surface-container flex flex-col gap-2">
          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span>Compartir vía WhatsApp / Apps</span>
            </button>
          )}

          {onOpenLanding && (
            <button
              onClick={() => {
                onClose();
                onOpenLanding();
              }}
              className="w-full py-2 bg-surface-container-highest border border-outline-variant hover:bg-surface-variant text-on-surface text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-tertiary">
                arrow_outward
              </span>
              <span>Ver Landing Page Completa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
