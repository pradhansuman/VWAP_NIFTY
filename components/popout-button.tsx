"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openIndexWindow, type IndexWindowId } from "@/lib/popout";

export function PopOutButton({
  symbol,
  label,
}: {
  symbol: IndexWindowId;
  label?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => openIndexWindow(symbol)}
      data-icon="inline-start"
    >
      <ExternalLink />
      {label ?? "Open window"}
    </Button>
  );
}
