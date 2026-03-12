export default function ResultsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-8">
        <div className="h-4 w-24 rounded shimmer mb-2" />
        <div className="h-8 w-64 rounded shimmer mb-2" />
        <div className="h-5 w-96 rounded shimmer" />
      </div>
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 rounded-lg shimmer" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-xl shimmer" />
        ))}
      </div>
    </div>
  );
}
