export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Loading workspace">
      <div className="skeleton skeleton-eyebrow" />
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-description" />
      <div className="skeleton skeleton-banner" />
      <div className="skeleton-row">
        {[0, 1, 2, 3].map((n) => (
          <div className="skeleton skeleton-metric" key={n} />
        ))}
      </div>
      <div className="skeleton skeleton-content" />
      <span className="sr-only">Loading workspace records…</span>
    </div>
  );
}
