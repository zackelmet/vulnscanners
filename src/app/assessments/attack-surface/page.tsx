import AssessmentPage, {
  AssessmentContent,
} from "@/components/assessments/AssessmentPage";

export const metadata = {
  title: "Attack Surface Assessment | VulnScanners",
  description:
    "Map your full external attack surface — domains, subdomains, exposed services, and open ports — with a done-for-you, analyst-reviewed assessment and report.",
};

const content: AssessmentContent = {
  kicker: "Attack Surface",
  title: "See everything an attacker can.",
  subtitle:
    "We map your full external attack surface — domains, subdomains, exposed services, and open ports — so you know exactly what you're defending and where to start.",
  intro: [
    "You can't protect what you don't know is exposed. Shadow IT, forgotten subdomains, and services that drifted public are where breaches start. We discover your internet-facing assets, map the ports and services running on them, and rank every exposure by risk.",
    "The result is a clear inventory of your external footprint and a prioritized list of what to lock down — the foundation of any real vulnerability-management program.",
  ],
  valueProps: [
    {
      title: "Discover forgotten assets",
      text: "Shadow IT, stale subdomains, and exposed services you didn't know were public — surfaced and inventoried.",
    },
    {
      title: "Mapped & ranked",
      text: "Every open port and running service identified with Nmap, then ranked by the risk it represents.",
    },
    {
      title: "Continuous, not one-off",
      text: "Re-run on a cadence so new exposure is caught as it appears, instead of once a year.",
    },
  ],
  steps: [
    {
      title: "Define the perimeter",
      text: "You give us your domains and IP ranges; we confirm you're authorized to assess them.",
    },
    {
      title: "Discover",
      text: "We enumerate internet-facing hosts and services across the agreed scope.",
    },
    {
      title: "Map & rank",
      text: "Nmap identifies open ports and service versions; an analyst ranks each exposure by real-world risk.",
    },
    {
      title: "Report",
      text: "You get an inventory of your external footprint and a prioritized list of what to close.",
    },
  ],
  faq: [
    {
      q: "What's the difference from a vulnerability assessment?",
      a: "An attack surface assessment answers “what's exposed?” — the inventory of assets, ports, and services an attacker can see. A vulnerability assessment goes a step further and tests those assets for specific flaws. Many teams start here, then assess the vulnerabilities on what they find.",
    },
    {
      q: "What gets discovered?",
      a: "Your internet-facing hosts, subdomains, open TCP ports, and the services and versions running on them — the full outside-in view of your perimeter.",
    },
    {
      q: "Who is this for?",
      a: "Teams that have grown faster than their asset inventory — and MSPs/MSSPs that need to baseline a new client's exposure quickly.",
    },
    {
      q: "What do I get?",
      a: "A branded report with your external asset inventory, every open service mapped, and a prioritized list of exposures with guidance on what to do about each.",
    },
    {
      q: "Do I need to prove authorization?",
      a: "Yes. We only assess assets you own or are explicitly authorized to test, confirmed in writing before any scanning begins.",
    },
    {
      q: "Can I run this myself?",
      a: "Yes — VulnScanners is self-serve. Buy scan credits and run Nmap on your own schedule. The assessment is for when you want the discovery, analyst review, and a finished report done for you.",
    },
  ],
  formCategory: "attack-surface-assessment",
  formSubject: "Attack surface assessment",
};

export default function AttackSurfaceAssessmentPage() {
  return <AssessmentPage c={content} />;
}
