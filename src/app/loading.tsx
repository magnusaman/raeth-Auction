export default function Loading() {
  return (
    <div className="min-h-screen relative">
      <div className="mx-auto max-w-[980px] px-6 pt-28 md:pt-44 pb-20 text-center">
        <div className="h-8 w-48 mx-auto mb-8 rounded-full shimmer" />
        <div className="h-16 md:h-24 w-3/4 mx-auto mb-4 rounded-2xl shimmer" />
        <div className="h-16 md:h-24 w-2/3 mx-auto mb-7 rounded-2xl shimmer" />
        <div className="h-6 w-96 mx-auto mb-12 rounded-lg shimmer" />
        <div className="flex justify-center gap-4">
          <div className="h-12 w-40 rounded-xl shimmer" />
          <div className="h-12 w-40 rounded-xl shimmer" />
        </div>
      </div>
    </div>
  );
}
