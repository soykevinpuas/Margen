import React, { useState } from 'react';

interface ImagenZoomProps {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: React.ReactNode;
}

export const ImagenZoom: React.FC<ImagenZoomProps> = ({
  src,
  alt,
  className,
  imgClassName,
  fallback,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (src) setOpen(true);
        }}
        className={`${className ?? ''} cursor-zoom-in`}
        aria-label={`Ampliar ${alt}`}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className={imgClassName}
            referrerPolicy="no-referrer"
          />
        ) : (
          fallback
        )}
      </button>

      {open && src && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl transition-transform duration-300 animate-[kpiPop_300ms_ease-out]"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
};
