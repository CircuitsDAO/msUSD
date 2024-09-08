import { ModulesConfig } from "@proto-kit/common";
import { msUSD } from "./stablecoin";
import { Balances } from "./framework";
import { UInt64 } from "@proto-kit/library";

export const modules = {
  msUSD,
  Balances,
};

export const config: ModulesConfig<typeof modules> = {
  msUSD: {},
  Balances: {
    totalSupply: UInt64.from(10000),
  },
};

export default {
  modules,
  config,
};
