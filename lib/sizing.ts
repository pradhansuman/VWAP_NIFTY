import type { Instrument } from "@/lib/types";
import type { PlaySetup } from "@/lib/playbook";

export const ATM_DELTA = 0.5;

export type OptionSizing = {
  symbol: string;
  lot: number;
  ltp: number;
  debit: number;
  delta: number;
  indexRisk: number;
  premiumRisk: number;
  rupeeRisk: number;
  rupeeTarget: number;
  premiumStop: number;
  premiumTarget: number;
};

export function optionSizing(
  setup: Pick<PlaySetup, "risk">,
  option: Pick<Instrument, "symbol" | "lotSize"> & { ltp: number },
): OptionSizing | null {
  if (!option.ltp || !option.lotSize || setup.risk <= 0) return null;
  const premiumRisk = setup.risk * ATM_DELTA;
  const rupeeRisk = premiumRisk * option.lotSize;
  return {
    symbol: option.symbol,
    lot: option.lotSize,
    ltp: option.ltp,
    debit: option.ltp * option.lotSize,
    delta: ATM_DELTA,
    indexRisk: setup.risk,
    premiumRisk,
    rupeeRisk,
    rupeeTarget: rupeeRisk * PLAY_RR,
    premiumStop: Math.max(0.05, option.ltp - premiumRisk),
    premiumTarget: option.ltp + PLAY_RR * premiumRisk,
  };
}

const PLAY_RR = 2;

export function pickAtmLeg(
  setup: PlaySetup | null,
  call?: (Pick<Instrument, "symbol" | "lotSize"> & { ltp: number }) | null,
  put?: (Pick<Instrument, "symbol" | "lotSize"> & { ltp: number }) | null,
) {
  if (!setup) return null;
  const leg = setup.option === "CE" ? call : put;
  if (!leg) return null;
  return optionSizing(setup, leg);
}
