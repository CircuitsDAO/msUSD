import { ModulesConfig } from "@proto-kit/common";
import { msUSD } from "./stablecoin";
import { Balances } from "./framework";

export const modules = {
  msUSD,
  Balances,
};

export const config: ModulesConfig<typeof modules> = {
  msUSD: {},
  Balances: {},
};

export default {
  modules,
  config,
};
