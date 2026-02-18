"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils"; // assuming you have this helper

interface IssueCardProps {
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  resolved?: boolean;
}

export function IssueCard({
  title,
  description,
  severity = "medium",
  resolved = false,
}: IssueCardProps) {
  const severityColors = {
    low: "text-green-600 bg-green-50",
    medium: "text-yellow-600 bg-yellow-50",
    high: "text-orange-600 bg-orange-50",
    critical: "text-red-600 bg-red-50",
  };

  return (
    <Card
      className={cn(
        "border-l-4",
        severity === "low" && "border-green-500",
        severity === "medium" && "border-yellow-500",
        severity === "high" && "border-orange-500",
        severity === "critical" && "border-red-500",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {resolved ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            severityColors[severity],
          )}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}{" "}
          {resolved ? "Resolved" : "Issue"}
        </div>
      </CardContent>
    </Card>
  );
}
