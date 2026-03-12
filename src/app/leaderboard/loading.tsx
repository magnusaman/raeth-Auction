export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-8">
        <div className="h-4 w-24 rounded shimmer mb-2" />
        <div className="h-8 w-48 rounded shimmer mb-2" />
        <div className="h-5 w-80 rounded shimmer" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl shimmer" />
        ))}
      </div>
      <div className="rounded-xl overflow-hidden border border-border-subtle">
        <div className="h-12 shimmer" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 shimmer border-t border-border-subtle" />
        ))}
      </div>
    </div>
  );
}
