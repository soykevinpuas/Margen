import { useEffect, useState } from 'react';

// Banner que avisa cuando llega una versión nueva (compara build-id)
const NuevaVersionBanner = () => {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    try {
      // Lee el id de build inyectado en el index.html
      const meta = document
        .querySelector('meta[name="build-id"]')
        ?.getAttribute('content');
      if (!meta) return;

      // Compara con la última versión vista y guarda la actual siempre
      const prev = localStorage.getItem('margen-build-id');
      if (prev && prev !== meta) setHasUpdate(true);
      localStorage.setItem('margen-build-id', meta);
    } catch {
      // localStorage puede fallar (modo privado, etc.): se ignora
    }
  }, []);

  if (!hasUpdate) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-primary text-on-primary flex items-center justify-center gap-3 shadow-lg rounded-b-2xl px-4 pt-[env(safe-area-inset-top)] py-3">
      <span className="font-bold text-sm">🆕 Nueva versión disponible</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-on-primary text-primary text-sm font-bold px-3 py-1 rounded-full hover:opacity-90 transition-all"
      >
        Actualizar
      </button>
    </div>
  );
};

export default NuevaVersionBanner;