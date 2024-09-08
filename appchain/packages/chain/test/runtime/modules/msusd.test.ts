import { PrivateKey, PublicKey } from "o1js";
import { TestingAppChain } from "@proto-kit/sdk";
import { msUSD } from "../../../src/runtime/stablecoin";
import { UInt224 } from "@proto-kit/library";

describe("msUSD", () => {
  it("should demonstrate init.", async () => {
    const appChain = TestingAppChain.fromRuntime({
      msUSD,
    });

    appChain.configurePartial({
      Runtime: {
        msUSD: {},
        Balances: {},
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();

    appChain.setSigner(alicePrivateKey);

    const ms = appChain.runtime.resolve("msUSD");

    const tx1 = await appChain.transaction(alice, async () => {
      ms.init(
        alice,
        UInt224.from("150000000000000000000"),
        UInt224.from("5000000000000000"),
        UInt224.from("1000000000000000000")
      );
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const owner = await appChain.query.runtime.msUSD.CircuitsDAO.get();
    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(owner.toBase58()).toBe(alice);
  });
});
