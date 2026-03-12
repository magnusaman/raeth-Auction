export default function TrendsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-8">
        <div className="h-4 w-20 rounded shimmer mb-2" />
        <div className="h-8 w-44 rounded shimmer mb-2" />
        <div className="h-5 w-72 rounded shimmer" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 rounded-xl shimmer" />
        ))}
      </div>
    </div>
  );
}
