import type { Metadata } from "next";
import { IndexWindowPage } from "@/components/index-window-page";

export const metadata: Metadata = { title: "Sensex — live window" };

export default function Page() {
  return <IndexWindowPage symbol="SENSEX" compact />;
}
