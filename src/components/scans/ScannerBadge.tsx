import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faNetworkWired,
  faBolt,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Per-scanner identity: distinct color + tiny icon, so scan types are
// distinguishable at a glance instead of a wall of identical blue pills.
const META: Record<
  string,
  { label: string; icon: IconDefinition; cls: string }
> = {
  nmap: {
    label: "Nmap",
    icon: faNetworkWired,
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  nuclei: {
    label: "Nuclei",
    icon: faBolt,
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  zap: {
    label: "ZAP",
    icon: faGlobe,
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};

export function ScannerBadge({ type }: { type: string }) {
  const meta = META[type] ?? {
    label: String(type || "scan").toUpperCase(),
    icon: faNetworkWired,
    cls: "bg-[#0366d6]/15 text-[#4493f8] border-[#0366d6]/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${meta.cls}`}
    >
      <FontAwesomeIcon icon={meta.icon} className="text-[0.65rem]" />
      {meta.label}
    </span>
  );
}
