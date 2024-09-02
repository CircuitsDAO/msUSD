import { State, StateMap, assert } from "@proto-kit/protocol";
import {
  RuntimeModule,
  runtimeModule,
  runtimeMethod,
  state,
} from "@proto-kit/module";
import { UInt224, UInt32 } from "@proto-kit/library";

import { PublicKey, Field } from "o1js";

interface StableConfig {
  stableBalances: StateMap<PublicKey, UInt224>;
  stableSupply: UInt224;
  collateralBalances: StateMap<PublicKey, UInt224>;
  collateralSupply: UInt224;
  collateralRatio: UInt32;
  CircuitsDAO: PublicKey;
}

@runtimeModule()
export class msUSD extends RuntimeModule<StableConfig> {
  @state() public stableBalances = StateMap.from(PublicKey, UInt224);
  @state() public stableSupply = State.from(UInt224);
  @state() public collateralBalances = StateMap.from(PublicKey, UInt224);
  @state() public collateralSupply = State.from(UInt224);
  @state() public collateralRatio = State.from(UInt32);
  @state() public CircuitsDAO = State.from(PublicKey); //Address of the community Multi-Sig.

  /// SETTER METHODS ==============================================

  @runtimeMethod()
  public async setCollateralRatio(ratio: UInt32): Promise<void> {
    assert(ratio.greaterThan(UInt32.from(0)));
    const current = (await this.collateralRatio.get()).value;
    assert(current.value.equals(0));
  }

  @runtimeMethod() public async setDAO(): Promise<void> {}

  /// GETTER METHODS ==============================================

  @runtimeMethod() public async getBalance(address: PublicKey): Promise<Field> {
    return (await this.stableBalances.get(address)).value.value || 0;
  }
  @runtimeMethod() public async getCollateralDeposited(
    address: PublicKey
  ): Promise<Field> {
    return (await this.collateralBalances.get(address)).value.value || 0;
  }

  @runtimeMethod() public async getStableSupply(): Promise<Field> {
    return (await this.stableSupply.get()).value.value;
  }

  @runtimeMethod() public async getCollateralSupply(): Promise<Field> {
    return (await this.collateralSupply.get()).value.value;
  }

  @runtimeMethod() public async getCollateralRatio(): Promise<Field> {
    return (await this.collateralRatio.get()).value.value;
  }

  @runtimeMethod() public async getDAO(): Promise<PublicKey> {
    return (await this.CircuitsDAO.get()).value.value;
  }

  /// CORE FUNCTIONS ==============================================

  @runtimeMethod() public async mint(amount: UInt224): Promise<boolean> {
    return true;
  }
  @runtimeMethod() public async burn(amount: UInt224): Promise<boolean> {
    return true;
  }

  @runtimeMethod() public async transfer(
    to: PublicKey,
    amount: UInt224
  ): Promise<boolean> {
    return true;
  }
}
