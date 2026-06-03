export default function AdminLoading() {
  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="admin-skeleton-line h-7 w-36" />
          <div className="admin-skeleton-line w-64" />
        </div>
        <div className="admin-skeleton-line h-10 w-28" />
      </div>

      <div className="admin-stats-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="admin-stat-card">
            <div className="admin-skeleton-line w-24" />
            <div className="admin-skeleton-line h-[70px] w-24" />
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="admin-skeleton-line h-10 w-full max-w-96" />
          <div className="admin-skeleton-line h-10 w-56" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-6 border-b border-[var(--stroke)] py-3">
              <div className="admin-skeleton-line" />
              <div className="admin-skeleton-line" />
              <div className="admin-skeleton-line" />
              <div className="admin-skeleton-line" />
              <div className="admin-skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
