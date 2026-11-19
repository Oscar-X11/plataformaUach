/** Skeleton del dashboard: misma geometría que la vista real para evitar saltos. */
export default function DashboardLoading() {
  const card = "rounded-2xl border border-uach-ink/[0.08] bg-uach-surface p-5";
  const line = "shimmer rounded-md";
  return (
    <div className="space-y-6 lg:space-y-8" aria-busy="true" aria-label="Cargando tu inicio">
      <div className="space-y-3">
        <div className={`${line} h-9 w-64 max-w-full`} />
        <div className={`${line} h-4 w-80 max-w-full`} />
        <div className={`${line} h-4 w-52`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-uach-petrol/90 p-6 md:col-span-2 xl:col-span-1">
          <div className="h-4 w-24 rounded-md bg-white/15" />
          <div className="mt-6 h-4 w-40 rounded-md bg-white/10" />
          <div className="mt-3 h-8 w-3/4 rounded-md bg-white/15" />
          <div className="mt-6 h-11 w-36 rounded-xl bg-white/15" />
        </div>
        {[0, 1].map((key) => (
          <div key={key} className={card}>
            <div className={`${line} h-4 w-28`} />
            <div className={`${line} mt-4 h-3 w-full`} />
            <div className={`${line} mt-3 h-3 w-5/6`} />
            <div className={`${line} mt-3 h-14 w-full`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className={card}>
            <div className="flex gap-3">
              <div className={`${line} h-10 w-10 rounded-xl`} />
              <div className="flex-1 space-y-2">
                <div className={`${line} h-4 w-3/4`} />
                <div className={`${line} h-3 w-1/2`} />
              </div>
            </div>
            <div className={`${line} mt-6 h-2 w-full`} />
          </div>
        ))}
      </div>
    </div>
  );
}
