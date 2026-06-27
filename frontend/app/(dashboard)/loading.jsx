export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-transparent border-t-[#8ab4f8] rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-transparent border-b-[#81c995] rounded-full animate-spin-reverse" />
        </div>
        <p className="text-[12px] font-medium text-[#9aa0a6] uppercase tracking-widest animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
