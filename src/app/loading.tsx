export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
