import type { Metadata } from "next";
import { IndexWindowView } from "@/components/index-window-view";

export const metadata: Metadata = {
  title: "Bank Nifty — live window",
};

export default function Page() {
  return <IndexWindowView symbol="BANKNIFTY" compact />;
}
