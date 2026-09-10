import React from 'react';
import {
  TrendingUp,
  PackageCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  BarChart3,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  Smartphone,
  Globe2,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onOpenAuth }) => {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <nav className="w-full max-w-5xl px-4 py-4 flex items-center justify-between border-b border-slate-800/60 sticky top-0 bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400 font-extrabold text-sm">
              %
            </div>
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-white block leading-tight">
              Margen
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
              Control de Inventario
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Iniciar Sesión
          </button>
          <button
            onClick={onEnterApp}
            className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
          >
            <span>Ir a la App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full max-w-4xl px-4 pt-12 pb-16 text-center flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gestión de Inventario & Márgenes Netos Realistas</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl">
          Calcula tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">ganancia real</span> de forma automática por lotes
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Diseñado para negocios, tiendas e importadores. Toma en cuenta envíos, impuestos, comisiones y costos de compra para saber exactamente cuánto ganas en cada venta.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>Acceder a la App</span>
          </button>

          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Crear Cuenta en la Nube</span>
          </button>
        </div>

        {/* Micro reassurance badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-4">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sin tarjetas requeridas
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sincronización Firebase
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Funciona en Móvil y Desktop
          </span>
        </div>

        {/* Mock App Preview Card */}
        <div className="w-full max-w-xl mt-8 p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl text-left relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="font-semibold text-slate-200">Panel de Control Margen</span>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 font-mono">
              LOTES ACTIVOS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Ventas de Hoy</span>
              <span className="text-lg font-bold text-emerald-400">$4,850.00 MXN</span>
              <span className="text-[10px] text-emerald-500 block mt-0.5">+32% de utilidad bruta</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Costo de Ventas</span>
              <span className="text-lg font-bold text-slate-200">$2,910.00 MXN</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Calculado por lotes de compra</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-100">Margen Neto Promedio</p>
                <p className="text-[10px] text-slate-400">39.8% tras gastos operativos</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">+ $1,940.00 MXN</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-5xl px-4 py-16 border-t border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Todo lo que necesitas para controlar tu negocio
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Sin hojas de cálculo complejas ni fórmulas propensas a errores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Descuento por Antigüedad</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descuenta las existencias comenzando automáticamente por el lote comprado primero. Cada lote guarda su costo exacto.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Prorrateo de Gastos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Suma envíos, impuestos de aduana y empaques a tus lotes de compra para calcular el verdadero costo unitario.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Márgenes y Utilidad Neta</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Resta gastos fijos de tu negocio (renta, servicios, publicidad) para obtener el resultado contable real.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Aislamiento por Usuario</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Base de datos privada e independiente respaldada por Google Firebase Firestore para cada cuenta registrada.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Alertas de Stock y Mermas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visualiza alertas instantáneas cuando un producto alcance su stock mínimo o registra pérdidas y mermas.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Diseño Mobile-First</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Optimizado para la velocidad en teléfonos inteligentes. Registra compras y ventas rápidamente desde cualquier lugar.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full max-w-4xl px-4 py-12 border-t border-slate-800/60 text-center">
        <h2 className="text-2xl font-extrabold text-white mb-8">
          ¿Cómo funciona Margen en 3 pasos?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 relative">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center mb-3">
              1
            </span>
            <h4 className="text-sm font-bold text-white mb-1">Registra Compras con Gastos</h4>
            <p className="text-xs text-slate-400">
              Ingresa la cantidad adquirida, el precio del proveedor y cualquier gasto de flete o aduana.
            </p>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 relative">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center mb-3">
              2
            </span>
            <h4 className="text-sm font-bold text-white mb-1">Cobra tus Ventas</h4>
            <p className="text-xs text-slate-400">
              Registra cada venta. Margen descuenta automáticamente los lotes de compra más antiguos con sus costos exactos.
            </p>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 relative">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center mb-3">
              3
            </span>
            <h4 className="text-sm font-bold text-white mb-1">Analiza tus Ganancias</h4>
            <p className="text-xs text-slate-400">
              Revisa gráficos de margen por producto, ventas diarias y reportes de utilidades netas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="w-full max-w-4xl px-4 py-12 my-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 text-center flex flex-col items-center gap-4 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Empieza a optimizar tu negocio hoy
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md">
            Prueba la demo inmediatamente en tu navegador o crea una cuenta gratis para guardar tu inventario en la nube.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <button
              onClick={onEnterApp}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <span>Abrir Aplicación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition-all"
            >
              Registrarse / Entrar
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 py-6 px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-5xl gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Margen</span>
          <span>© {new Date().getFullYear()} — Control de Inventarios y Ganancias Reales</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button onClick={onEnterApp} className="hover:text-emerald-400">
            Abrir App
          </button>
          <button onClick={onOpenAuth} className="hover:text-emerald-400">
            Cuenta Nube
          </button>
        </div>
      </footer>
    </div>
  );
};
