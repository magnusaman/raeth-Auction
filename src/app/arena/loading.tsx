export default function ArenaLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-8">
        <div className="h-4 w-20 rounded shimmer mb-2" />
        <div className="h-8 w-40 rounded shimmer mb-2" />
        <div className="h-5 w-72 rounded shimmer" />
      </div>
      <div className="flex gap-3 mb-6">
        <div className="h-10 flex-1 max-w-sm rounded-lg shimmer" />
        <div className="h-10 w-44 rounded-lg shimmer" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 rounded-xl shimmer" />
        ))}
      </div>
    </div>
  );
}
