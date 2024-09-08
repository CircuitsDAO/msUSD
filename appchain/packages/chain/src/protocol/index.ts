import { VanillaProtocolModules } from "@proto-kit/library";
import { ModulesConfig } from "@proto-kit/common";

const modules = VanillaProtocolModules.mandatoryModules({});

const config: ModulesConfig<typeof modules> = {
  ...VanillaProtocolModules.mandatoryConfig(),
};

export default { modules, config };
