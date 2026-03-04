// components/risk-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // shadcn helper — make sure it exists (from init)

interface RiskBadgeProps {
  level: "low" | "medium" | "high" | "critical" | string; // allow string fallback
  probability?: string;
}

export function RiskBadge({ level, probability }: RiskBadgeProps) {
  const variants = {
    low: {
      variant: "default",
      probability:
        "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800",
      label: "Low Risk",
    },
    medium: {
      variant: "secondary",
      probability:
        "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:hover:bg-yellow-800",
      label: "Medium Risk",
    },
    high: {
      variant: "destructive",
      probability:
        "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800",
      label: "High Risk",
    },
    critical: {
      variant: "destructive",
      probability:
        "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800",
      label: "Critical Risk",
    },
  };

  const normalized = (level?.toLowerCase() ||
    "unknown") as keyof typeof variants;
  const config = variants[normalized] || {
    variant: "outline",
    probability:
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    label: "Unknown",
  };

  return (
    <Badge
      variant={config.variant as any} // type workaround if needed
      className={cn(config.probability, "font-medium px-3 py-1", probability)}
    >
      {config.label}
    </Badge>
  );
}
