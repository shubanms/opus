export default function PageWrapper({ title, subtitle, children }) {
  return (
    <div className="anim-fade-slide-up px-5 pt-8" style={{ color: 'var(--color-text-primary)' }}>
      {title && (
        <header className="mb-6">
          <h1 className="font-display text-4xl font-bold leading-none">{title}</h1>
          {subtitle && (
            <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
