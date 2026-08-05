export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
        <p className="text-sm text-white/30">Loading...</p>
      </div>
    </div>
  );
}
