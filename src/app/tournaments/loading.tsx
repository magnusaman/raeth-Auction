export default function TournamentsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="mb-8">
        <div className="h-4 w-24 rounded shimmer mb-2" />
        <div className="h-8 w-56 rounded shimmer mb-2" />
        <div className="h-5 w-80 rounded shimmer" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-xl shimmer" />
        ))}
      </div>
    </div>
  );
}
