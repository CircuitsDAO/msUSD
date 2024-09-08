import { PrivateKey, PublicKey } from "o1js";
import { TestingAppChain } from "@proto-kit/sdk";
import { msUSD } from "../../../src/runtime/stablecoin/msUSD";

describe("msUSD", () => {
  let appChain: ReturnType<
    typeof TestingAppChain.fromRuntime<{ msUSD: typeof msUSD }>
  >;

  let ms: msUSD;
  const alicePrivateKey = PrivateKey.random();

  beforeAll(async () => {
    appChain = TestingAppChain.fromRuntime({
      msUSD,
    });

    appChain.configurePartial({
      Runtime: {
        msUSD: {},
        Balances: {},
      },
    });

    await appChain.start();
    appChain.setSigner(alicePrivateKey);
    ms = appChain.runtime.resolve("msUSD");
  });

  it("Should be at an uninitialized stage.", async () => {
    const daoAddress: PublicKey =
      await appChain.query.runtime.msUSD.CircuitsDAO.get();
    console.log(daoAddress.toBase58());
  });
});
