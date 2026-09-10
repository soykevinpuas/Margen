import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LogIn, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTabTitle: string;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTabTitle,
  onOpenSettings,
  onOpenAuth,
  onOpenLanding,
}) => {
  const { settings, updateSettings } = useApp();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30">
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex flex-col">
          <div className="text-left flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
              {settings.businessName || 'Margen'}
            </span>
          </div>
          <h1 className="text-lg font-headline font-bold leading-tight text-on-surface">
            {currentTabTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant">
            <button
              onClick={() => updateSettings({ displayCurrency: 'MXN' })}
              className={`px-2 py-0.5 text-xs font-bold rounded-[6px] transition-all ${
                settings.displayCurrency === 'MXN'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              MXN
            </button>
            <button
              onClick={() => updateSettings({ displayCurrency: 'USD' })}
              className={`px-2 py-0.5 text-xs font-bold rounded-[6px] transition-all ${
                settings.displayCurrency === 'USD'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              USD
            </button>
          </div>

          {/* Auth / Account Badge */}
          {user ? (
            <button
              onClick={onOpenSettings}
              title={`Usuario: ${user.email}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all text-xs font-bold"
            >
              <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold transition-all shadow-sm text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Configuración"
            className="w-8 h-8 rounded-xl bg-surface-container border border-outline/30 flex items-center justify-center text-on-surface hover:text-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
