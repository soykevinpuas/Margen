import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Download,
  Globe,
  QrCode,
  Store,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import {
  buildWhatsAppLink,
  checkSlugAvailable,
  normalizeSlug,
} from '../../lib/vitrina';
import type { VitrinaConfig } from '../../types';
import { AvatarLottie } from './AvatarLottie';

// Presets disponibles para el selector (misma lista que AvatarLottie)
const PRESETS = [
  { id: 'luna', nombre: 'Luna' },
  { id: 'nube', nombre: 'Nube' },
  { id: 'rombo', nombre: 'Rombo' },
];

const COLORES = ['#10B981', '#3B82F6', '#F59E0B', '#F43F5E', '#8B5CF6', '#14B8A6'];

type SlugEstado = 'inicial' | 'verificando' | 'disponible' | 'en-uso' | 'invalido';

export const VitrinaPanel: React.FC = () => {
  const { settings, actualizarVitrina } = useApp();
  const { user } = useAuth();

  const vitrina = settings.vitrina;
  const slugGuardado = vitrina?.slug;

  // Estado del formulario (inicializa desde la config guardada)
  const [activa, setActiva] = useState(vitrina?.activa ?? false);
  const [slugTexto, setSlugTexto] = useState(vitrina?.slug ?? '');
  const [whatsapp, setWhatsapp] = useState(vitrina?.whatsapp ?? '');
  const [mensajePlantilla, setMensajePlantilla] = useState(
    vitrina?.mensajePlantilla ?? ''
  );
  const [preset, setPreset] = useState(vitrina?.avatar?.preset ?? 'luna');
  const [nombreAvatar, setNombreAvatar] = useState(vitrina?.avatar?.nombre ?? '');
  const [colorAvatar, setColorAvatar] = useState(vitrina?.avatar?.color ?? '#10B981');
  const [saludo, setSaludo] = useState(vitrina?.avatar?.saludo ?? '');

  const [slugEstado, setSlugEstado] = useState<SlugEstado>('inicial');
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  const slugNormalizado = normalizeSlug(slugTexto);
  const linkPublico = slugNormalizado
    ? `${window.location.origin}/${slugNormalizado}`
    : '';

  // Verifica disponibilidad del slug en vivo (debounced)
  useEffect(() => {
    const slug = normalizeSlug(slugTexto);
    if (!slug) {
      setSlugEstado(slugTexto.trim() ? 'invalido' : 'inicial');
      return;
    }
    if (slug === slugGuardado) {
      setSlugEstado('disponible'); // el que ya tiene este negocio
      return;
    }
    setSlugEstado('verificando');
    const timer = setTimeout(() => {
      void checkSlugAvailable(db, slug).then((ok) =>
        setSlugEstado(ok ? 'disponible' : 'en-uso')
      );
    }, 450);
    return () => clearTimeout(timer);
  }, [slugTexto, slugGuardado]);

  const puedeGuardar =
    !!user &&
    slugEstado !== 'verificando' &&
    (!activa || (slugNormalizado !== '' && slugEstado === 'disponible'));

  const guardar = () => {
    if (!puedeGuardar || guardando) return;
    const config: VitrinaConfig = {
      activa,
      slug: slugNormalizado || undefined,
      whatsapp: whatsapp.trim() || undefined,
      mensajePlantilla: mensajePlantilla.trim() || undefined,
      avatar: {
        preset,
        nombre: nombreAvatar.trim(),
        color: colorAvatar,
        saludo: saludo.trim() || undefined,
      },
    };
    setGuardando(true);
    actualizarVitrina(config);
    setTimeout(() => {
      setGuardando(false);
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 2500);
    }, 500);
  };

  const copiarLink = async () => {
    if (!linkPublico) return;
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  // Descarga el QR como PNG (SVG → canvas → PNG)
  const descargarQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const escala = 4;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `vitrina-${slugNormalizado}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
  };

  const inputCls =
    'w-full h-9 bg-surface-container-highest border border-outline-variant text-on-surface rounded-lg px-3 font-bold text-[11px] focus:outline-none focus:border-primary disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="p-3 bg-surface-container border border-outline/30 rounded-xl space-y-3">
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-primary" />
          Vitrina Virtual (pública)
        </span>
        {user ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Globe className="w-3 h-3" /> En línea
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Local
          </span>
        )}
      </div>

      {/* Gate: requiere login */}
      {!user && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 font-bold">
          Inicia sesión para activar tu vitrina (necesita base de datos en la
          nube).
        </div>
      )}

      {/* Vista previa en vivo del avatar */}
      <div className="p-3 bg-surface-container-highest/50 border border-outline-variant/40 rounded-xl">
        <AvatarLottie
          preset={preset}
          nombre={nombreAvatar}
          color={colorAvatar}
          saludo={saludo}
          nombreNegocio={settings.businessName}
        />
      </div>

      {/* Switch activar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-on-surface">
            Activar vitrina pública
          </p>
          <p className="text-[9px] text-on-surface-variant">
            Tu catálogo visible en un link y QR sin login
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activa}
          disabled={!user}
          onClick={() => setActiva((v) => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 disabled:opacity-50 disabled:pointer-events-none ${
            activa ? 'bg-primary' : 'bg-surface-container-highest'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              activa ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Slug */}
      <div>
        <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1">
          Link público (slug)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center h-9 bg-surface-container-highest border border-outline-variant rounded-lg px-3 focus-within:border-primary min-w-0">
            <span className="text-[10px] text-on-surface-variant font-mono shrink-0">
              /
            </span>
            <input
              type="text"
              value={slugTexto}
              disabled={!user}
              maxLength={30}
              placeholder="tu-negocio"
              onChange={(e) => setSlugTexto(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-[11px] font-bold font-mono text-on-surface focus:outline-none placeholder:font-medium placeholder:text-on-surface-variant/60 disabled:pointer-events-none"
            />
          </div>
          {/* Estado del slug */}
          {slugEstado === 'verificando' && (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          )}
          {slugEstado === 'disponible' && slugNormalizado && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 shrink-0">
              <Check className="w-3 h-3" /> Disponible
            </span>
          )}
          {slugEstado === 'en-uso' && (
            <span className="text-[9px] font-bold text-error shrink-0">
              slug en uso
            </span>
          )}
          {slugEstado === 'invalido' && (
            <span className="text-[9px] font-bold text-amber-400 shrink-0">
              3-30 caracteres (a-z, 0-9, - o _)
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1">
          WhatsApp del negocio (solo dígitos, con código de país)
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={whatsapp}
          disabled={!user}
          maxLength={15}
          placeholder="5215551234567"
          onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
          className={inputCls}
        />
      </div>

      {/* Mensaje plantilla */}
      <div>
        <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1">
          Mensaje de WhatsApp (opcional)
        </label>
        <input
          type="text"
          value={mensajePlantilla}
          disabled={!user}
          maxLength={120}
          placeholder="Hola, me interesa: {nombre} ({precio})"
          onChange={(e) => setMensajePlantilla(e.target.value)}
          className={inputCls}
        />
        <p className="text-[9px] text-on-surface-variant mt-1">
          Variables: {'{nombre}'} y {'{precio}'}
        </p>
      </div>

      {/* Avatar: preset / nombre / color / saludo */}
      <div className="space-y-2">
        <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[9px]">
          Avatar de la vitrina
        </span>

        {/* Selector de presets */}
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!user}
              onClick={() => setPreset(p.id)}
              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:pointer-events-none ${
                preset === p.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-outline-variant bg-surface-container-highest/50 hover:border-outline'
              }`}
            >
              <div className="scale-[0.62] -my-2.5 pointer-events-none">
                <AvatarLottie preset={p.id} nombre="" color={colorAvatar} />
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant">
                {p.nombre}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={nombreAvatar}
            disabled={!user}
            maxLength={24}
            placeholder="Nombre del avatar"
            onChange={(e) => setNombreAvatar(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            value={saludo}
            disabled={!user}
            maxLength={40}
            placeholder="Saludo (ej. ¡Hola!)"
            onChange={(e) => setSaludo(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(colorAvatar) ? colorAvatar : '#10B981'}
            disabled={!user}
            onChange={(e) => setColorAvatar(e.target.value)}
            className="w-9 h-9 rounded-lg border border-outline-variant bg-transparent cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Color del avatar"
          />
          <div className="flex gap-1.5 flex-1">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!user}
                onClick={() => setColorAvatar(c)}
                aria-label={`Color ${c}`}
                className={`w-6 h-6 rounded-full border-2 transition-all disabled:opacity-50 disabled:pointer-events-none ${
                  colorAvatar.toLowerCase() === c.toLowerCase()
                    ? 'border-on-surface scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* QR del link público */}
      {linkPublico && (
        <div className="p-3 bg-white rounded-xl flex flex-col items-center gap-2">
          <div ref={qrRef}>
            <QRCodeSVG
              value={linkPublico}
              size={130}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <p className="text-[9px] font-bold tracking-wider text-slate-700 uppercase">
            Escanea para abrir tu vitrina
          </p>
          <div className="flex gap-1.5 w-full">
            <button
              type="button"
              onClick={copiarLink}
              className="flex-1 py-1.5 bg-surface-container text-on-surface border border-outline-variant rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
            >
              {copiado ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiado ? 'Copiado' : 'Copiar link'}
            </button>
            <button
              type="button"
              onClick={descargarQR}
              className="flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:opacity-95 transition-all"
            >
              <Download className="w-3 h-3" />
              QR PNG
            </button>
          </div>
        </div>
      )}

      {/* Guardar */}
      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar || guardando}
        className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-sm hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
      >
        {guardando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : guardadoOk ? (
          <>
            <Check className="w-4 h-4" /> ¡Vitrina guardada!
          </>
        ) : (
          <>
            <QrCode className="w-4 h-4" />
            Guardar vitrina
          </>
        )}
      </button>
      {guardadoOk && activa && linkPublico && (
        <p className="text-[10px] text-emerald-400 font-bold text-center">
          Tu vitrina está en {linkPublico}
        </p>
      )}
    </div>
  );
};
