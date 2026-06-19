// Per-scanner identity: distinct color so scan types are distinguishable at a
// glance instead of a wall of identical blue pills.
const META: Record<string, { label: string; cls: string }> = {
  nmap: {
    label: "Nmap",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  nuclei: {
    label: "Nuclei",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  zap: {
    label: "ZAP",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};

export function ScannerBadge({ type }: { type: string }) {
  const meta = META[type] ?? {
    label: String(type || "scan").toUpperCase(),
    cls: "bg-[#0366d6]/15 text-[#4493f8] border-[#0366d6]/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
