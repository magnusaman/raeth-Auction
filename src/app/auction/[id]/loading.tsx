export default function AuctionLoading() {
  return (
    <div className="min-h-screen px-4 py-6">
      {/* Top bar skeleton */}
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl shimmer" />
            <div>
              <div className="h-5 w-48 rounded shimmer mb-2" />
              <div className="h-4 w-32 rounded shimmer" />
            </div>
          </div>
          <div className="h-10 w-28 rounded-lg shimmer" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* Main panel */}
          <div className="space-y-5">
            <div className="h-64 rounded-2xl shimmer" />
            <div className="h-48 rounded-2xl shimmer" />
          </div>
          {/* Sidebar */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl shimmer" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
