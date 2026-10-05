import BackButton from './BackButton.jsx';

// `back` puts the shared Back button above the title: pass the page to go up
// to when there is no history to go back through (`back="/profile"`), or
// `true` for Home.
export default function PageWrapper({ title, subtitle, back, children }) {
  return (
    <div className="px-5 pt-8" style={{ color: 'var(--color-text-primary)' }}>
      {back && <BackButton fallback={typeof back === 'string' ? back : '/home'} className="mb-3" />}
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
