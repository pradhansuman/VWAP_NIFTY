import type { Metadata } from "next";
import { IndexWindowView } from "@/components/index-window-view";

export const metadata: Metadata = {
  title: "Nifty 50 — live window",
};

export default function Page() {
  return <IndexWindowView symbol="NIFTY" compact />;
}
