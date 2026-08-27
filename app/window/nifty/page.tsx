import type { Metadata } from "next";
import { IndexWindowPage } from "@/components/index-window-page";

export const metadata: Metadata = { title: "Nifty 50 — live window" };

export default function Page() {
  return <IndexWindowPage symbol="NIFTY" compact />;
}
