import { State, StateMap, assert } from "@proto-kit/protocol";
import {
  RuntimeModule,
  runtimeModule,
  runtimeMethod,
  state,
} from "@proto-kit/module";
import { UInt224, UInt32 } from "@proto-kit/library";

import { PublicKey, Field, Bool } from "o1js";

interface StableConfig {
  stableBalances: StateMap<PublicKey, UInt224>;
  stableSupply: UInt224;
  collateralBalances: StateMap<PublicKey, UInt224>;
  collateralSupply: UInt224;
  collateralPrice: UInt224;
  collateralRatio: UInt32;
  systemLocked: Bool;
  CircuitsDAO: PublicKey;
}

@runtimeModule()
export class msUSD extends RuntimeModule<StableConfig> {
  @state() public stableBalances = StateMap.from(PublicKey, UInt224);
  @state() public stableSupply = State.from(UInt224);
  @state() public collateralBalances = StateMap.from(PublicKey, UInt224);
  @state() public collateralSupply = State.from(UInt224);
  @state() public collateralPrice = State.from(UInt224);
  @state() public collateralRatio = State.from(UInt224);
  @state() public CircuitsDAO = State.from(PublicKey);
  @state() public systemLocked = State.from(Bool);
  @state() public fee = State.from(UInt224);

  /// SETTER METHODS ==============================================

  @runtimeMethod() public async init(
    toSetRatio: UInt32,
    toSetMultiSig: PublicKey
  ): Promise<void> {
    assert((await this.collateralRatio.get()).isSome.not());
    assert((await this.CircuitsDAO.get()).isSome.not());

    toSetRatio.assertGreaterThan(UInt32.from(0));
    assert(toSetMultiSig.isEmpty().not());

    this.collateralRatio.set(toSetRatio);
    this.CircuitsDAO.set(toSetMultiSig);
    this.fee.set(UInt224.from(5000000));
  }

  /// UPDATE METHODS ==============================================

  @runtimeMethod()
  public async updateCollateralRatio(ratio: UInt224): Promise<void> {
    assert((await this.collateralRatio.get()).isSome);
    assert(ratio.greaterThan(UInt224.from(0)));
    assert(
      ratio
        .equals(
          UInt224.Safe.fromField((await this.collateralRatio.get()).value.value)
        )
        .not()
    );

    this.collateralRatio.set(ratio);
  }

  @runtimeMethod() public async setDAO(
    updatedMultiSig: PublicKey
  ): Promise<void> {
    assert((await this.CircuitsDAO.get()).isSome.not());
    assert(updatedMultiSig.isEmpty().not());

    this.CircuitsDAO.set(updatedMultiSig);
  }

  @runtimeMethod() public async setPrice(price: UInt224): Promise<void> {
    assert(
      this.transaction.sender.value.equals((await this.CircuitsDAO.get()).value)
    );

    this.collateralPrice.set(price);
  }

  /// GETTER METHODS ==============================================

  @runtimeMethod() public async getBalance(address: PublicKey): Promise<Field> {
    return (await this.stableBalances.get(address)).value.value || 0;
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

  @runtimeMethod() public async getCollateralPrice(): Promise<UInt224> {
    return UInt224.Safe.fromField(
      (await this.collateralPrice.get()).value.value
    );
  }

  @runtimeMethod() public async getCollateralDeposited(
    address: PublicKey
  ): Promise<Field> {
    return (await this.collateralBalances.get(address)).value.value || 0;
  }

  /// CORE FUNCTIONS ==============================================

  /// LOCKS ===============================================

  @runtimeMethod() private async unlockSystem(): Promise<void> {
    assert(
      (await this.systemLocked.get()).value
        .and(
          (await this.collateralPrice.get()).value.value.lessThan(
            Field.from(10500000000)
          )
        )
        .and(
          (await this.collateralPrice.get()).value.value.greaterThan(
            Field.from(9500000000)
          )
        )
    );
    this.systemLocked.set(Bool(false));
  }

  @runtimeMethod() private async lockSystem(): Promise<void> {
    if ((await this.systemLocked.get()).value.not()) {
      this.systemLocked.set(Bool(true));
    }
  }

  @runtimeMethod() private async checkPrice(): Promise<void> {
    const marketPrice = await this.getCollateralPrice();

    if (
      marketPrice
        .lessThan(UInt224.from(9000000000))
        .or(marketPrice.greaterThan(UInt224.from(11000000000)))
    ) {
      this.lockSystem();
    } else if (
      (await this.systemLocked.get()).value
        .and(marketPrice.greaterThan(UInt224.from(9500000000)))
        .and(marketPrice.lessThan(UInt224.from(10500000000)))
    ) {
      this.unlockSystem();
    }
  }

  /// MINT / BURNS ============================================

  @runtimeMethod() public async mint(
    stablecoinAmount: UInt224,
    minaCollateral: UInt224
  ): Promise<boolean> {
    this.checkPrice();
    if (this.systemLocked) {
      return false;
    }

    const sender = this.transaction.sender.value;
    // const minaUsdRate = getMinaUsdRate();
    const minaUsdRate = UInt224.from(0);
    const requiredCollateral = stablecoinAmount
      .mul(
        UInt224.Safe.fromField((await this.collateralRatio.get()).value.value)
      )
      .div(minaUsdRate);
    if (minaCollateral >= requiredCollateral) {
      const fee = stablecoinAmount
        .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
        .div(10000000000);
      const mintedAmount = stablecoinAmount.sub(fee);

      const currentStableBalance =
        UInt224.Safe.fromField(
          (await this.stableBalances.get(sender)).value.value
        ) || UInt224.from(0);
      const currentCollateralBalance =
        UInt224.Safe.fromField(
          (await this.collateralBalances.get(sender)).value.value
        ) || UInt224.from(0);

      this.stableBalances.set(sender, currentStableBalance.add(mintedAmount));
      this.stableSupply.set(
        UInt224.Safe.fromField((await this.stableSupply.get()).value.value).add(
          mintedAmount
        )
      );

      this.collateralBalances.set(
        sender,
        currentCollateralBalance.add(requiredCollateral)
      );
      this.collateralSupply.set(
        UInt224.Safe.fromField(
          (await this.collateralSupply.get()).value.value
        ).add(requiredCollateral)
      );

      return true;
    }
    return false;
  }

  @runtimeMethod() public async burn(amount: UInt224): Promise<Bool> {
    return Bool(true);
  }

  @runtimeMethod() public async transfer(
    to: PublicKey,
    amount: UInt224
  ): Promise<boolean> {
    return true;
  }
}
