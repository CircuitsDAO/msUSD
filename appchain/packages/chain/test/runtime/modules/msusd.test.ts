import { PrivateKey, PublicKey } from "o1js";
import { TestingAppChain } from "@proto-kit/sdk";
import { msUSD } from "../../../src/runtime/stablecoin";
import { UInt224 } from "@proto-kit/library";
import assert from "assert";

describe("msUSD", () => {
  let appChain: ReturnType<
    typeof TestingAppChain.fromRuntime<{ msUSD: typeof msUSD }>
  >;

  let ms: msUSD;
  const alicePrivateKey = PrivateKey.random();
  const alice = alicePrivateKey.toPublicKey();

  appChain = TestingAppChain.fromRuntime({
    msUSD,
  });

  appChain.configurePartial({
    Runtime: {
      Balances: {},
      msUSD: {},
    },
  });

  beforeAll(async () => {
    await appChain.start();

    appChain.setSigner(alicePrivateKey);
  });
  it("Should set the init values", async () => {
    ms = appChain.runtime.resolve("msUSD");
    const tx = await appChain.transaction(alice, async () => {
      await ms.init(
        alice,
        UInt224.from("150000000000000000000"),
        UInt224.from("5000000000000000"),
        UInt224.from("1000000000000000000")
      );
    });

    await tx.sign();
    await tx.send();

    await appChain.produceBlock();

    const owner = await appChain.query.runtime.msUSD.CircuitsDAO.get();
    assert(owner.toBase58() == alice.toBase58());
    // expect(block?.transactions[0].status.toBoolean()).toBe(true);
    // assert(owner.toBase58() == alice);
  });
});
