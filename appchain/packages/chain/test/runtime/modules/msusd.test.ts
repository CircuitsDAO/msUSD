import { PublicKey, Bool } from "o1js";
import { TestingAppChain } from "@proto-kit/sdk";
import { StateMap } from "@proto-kit/protocol";
import { UInt224 } from "@proto-kit/library";
import { msUSD } from "../../../src/runtime/modules/msUSD";

describe("msUSD", () => {
  it("should demonstrate how msUSD work", async () => {
    const appChain = TestingAppChain.fromRuntime({
      msUSD,
    });

    appChain.configurePartial({
      Runtime: {
        msUSD: {
          stableBalances: new StateMap<PublicKey, UInt224>(PublicKey, UInt224),
          stableSupply: UInt224.from(0),
          collateralBalances: new StateMap<PublicKey, UInt224>(
            PublicKey,
            UInt224
          ),
          collateralSupply: UInt224.from(0),
          collateralPrice: UInt224.from(0),
          collateralRatio: UInt224.from(0),
          systemLocked: Bool(false),
          CircuitsDAO: PublicKey.empty(),
          fee: UInt224.from(0),
          decimals: UInt224.from(0),
          stableFeeCollected: UInt224.from(0),
          collateralFeeCollected: UInt224.from(0),
          treasuryStableAmount: UInt224.from(0),
          treasuryCollateralAmount: UInt224.from(0),
          emergencyStableAmount: UInt224.from(0),
          emergencyCollateralAmount: UInt224.from(0),
        },
      },
    });

    await appChain.start();
  });
});
