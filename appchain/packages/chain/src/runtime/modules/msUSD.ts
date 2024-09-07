/// ONS

/// Author : br0wnD3v
/// Description : Business Logic for an overcollateralized stablecoin's POC written as an Appchain.
/// Advantages : Fast - Cheap - MEV Protected - The whole state is verifiable.
/// Mock : The price of the underlying collateral is simply set as a variable which is updated by the
///        CircuitsDAO public key.

import { State, StateMap, assert } from "@proto-kit/protocol";
import {
  RuntimeModule,
  runtimeModule,
  runtimeMethod,
  state,
} from "@proto-kit/module";
import { UInt224 } from "@proto-kit/library";
import { PublicKey, Field, Bool } from "o1js";

interface StableConfig {
  stableBalances: StateMap<PublicKey, UInt224>;
  stableSupply: UInt224;
  collateralBalances: StateMap<PublicKey, UInt224>;
  collateralSupply: UInt224;
  collateralPrice: UInt224;
  collateralRatio: UInt224;
  systemLocked: Bool;
  CircuitsDAO: PublicKey;
  fee: UInt224;
  feeCollected: UInt224;
  decimals: UInt224;
}

@runtimeModule()
export class msUSD extends RuntimeModule<StableConfig> {
  @state() public stableBalances = StateMap.from(PublicKey, UInt224);
  @state() public stableSupply = State.from(UInt224);
  @state() public collateralBalances = StateMap.from(PublicKey, UInt224);
  @state() public collateralSupply = State.from(UInt224);

  /// UPDATED REGULARLY BY THE DAO'S MULTISIG
  @state() public collateralPrice = State.from(UInt224);

  @state() public collateralRatio = State.from(UInt224);

  @state() public CircuitsDAO = State.from(PublicKey);

  /// FOR FAULT TOLERENCE AND EMERGENCY DEPEGS
  @state() public systemLocked = State.from(Bool);

  @state() public fee = State.from(UInt224);
  @state() public feeCollected = State.from(UInt224);

  @state() public decimals = State.from(UInt224);

  /// SETTER METHODS ==============================================
  /// @param toSetRatio - Default is 15-

  @runtimeMethod() public async init(
    _circuitsDao: PublicKey,
    _ratio: UInt224, /// 150% == 15e19
    _fee: UInt224, /// 0.05% == 5e16
    _decimals: UInt224 /// Default 18 = 1000000000000000000
  ): Promise<void> {
    const zero = UInt224.from(0);

    assert((await this.collateralRatio.get()).isSome.not());
    assert((await this.CircuitsDAO.get()).isSome.not());
    assert((await this.decimals.get()).isSome.not());
    assert((await this.fee.get()).isSome.not());

    assert(_circuitsDao.isEmpty().not());
    assert(_ratio.greaterThan(zero));
    assert(_fee.greaterThan(zero));
    assert(_decimals.greaterThan(zero));

    this.stableSupply.set(zero);
    this.collateralSupply.set(zero);
    this.CircuitsDAO.set(_circuitsDao);

    this.systemLocked.set(Bool(false));
    this.collateralRatio.set(_ratio);
    this.fee.set(_fee);
    this.decimals.set(_decimals);
  }

  @runtimeMethod() public async setDAO(
    updatedMultiSig: PublicKey
  ): Promise<void> {
    assert((await this.CircuitsDAO.get()).isSome.not());
    assert(updatedMultiSig.isEmpty().not());

    this.CircuitsDAO.set(updatedMultiSig);
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

  @runtimeMethod() public async updateCollateralPrice(
    price: UInt224
  ): Promise<void> {
    assert(
      this.transaction.sender.value.equals((await this.CircuitsDAO.get()).value)
    );

    this.collateralPrice.set(price);
  }

  /// GETTER METHODS ==============================================

  @runtimeMethod() public async getCollateralBalance(
    address: PublicKey
  ): Promise<Field> {
    return (await this.collateralBalances.get(address)).value.value || 0;
  }

  @runtimeMethod() public async getStableBalance(
    address: PublicKey
  ): Promise<Field> {
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

  @runtimeMethod() public async getCollateralDeposited(
    address: PublicKey
  ): Promise<Field> {
    return (await this.collateralBalances.get(address)).value.value || 0;
  }

  /// CORE GETTERS ==================================

  @runtimeMethod() public async getCollateralPriceUsd(): Promise<UInt224> {
    return UInt224.Safe.fromField(
      (await this.collateralPrice.get()).value.value
    );
  }

  @runtimeMethod() public async getTotalCollateralValueUsd(): Promise<UInt224> {
    const minaUsdRate = await this.getCollateralPriceUsd();
    const totalCollateral = UInt224.Safe.fromField(
      (await this.collateralSupply.get()).value.value
    );

    return totalCollateral.mul(minaUsdRate).div(1e18);
  }

  @runtimeMethod() public async getStablePrice(): Promise<UInt224> {
    const totalCollateralValueUsd = await this.getTotalCollateralValueUsd();
    if (
      (await this.stableSupply.get()).value.value
        .equals(Field.from(0))
        .toBoolean()
    ) {
      return UInt224.from(1e18); // Return 1, scaled to 1e18
    }
    const scaleFactor = UInt224.from(1e18);
    return totalCollateralValueUsd
      .mul(scaleFactor)
      .div(UInt224.Safe.fromField((await this.stableSupply.get()).value.value));
  }

  @runtimeMethod() public async getReleasableCollateral(
    _stablecoinAmount: UInt224,
    _fee: UInt224
  ): Promise<UInt224> {
    return UInt224.from(0);
  }

  /// CORE FUNCTIONS ==============================================

  /// LOCKS ===============================================
  /// CRITERIA FOR LOCKS AND UNLOCKS :
  /// LOCKS - THE PRICE DEPEGS ABOVE $1.05 OR BELOW $0.95
  /// UNLOCKS - THE PRICE COMES BACK TO BELOW $1.01 OR ABOVE $0.99

  @runtimeMethod() private async unlockSystem(): Promise<void> {
    if ((await this.systemLocked.get()).value.toBoolean()) {
      this.systemLocked.set(Bool(false));
    }
    this.systemLocked.set(Bool(false));
  }

  @runtimeMethod() private async lockSystem(): Promise<void> {
    if ((await this.systemLocked.get()).value.not().toBoolean()) {
      this.systemLocked.set(Bool(true));
    }
  }

  @runtimeMethod() private async stablePriceChecks(): Promise<Bool> {
    const marketPrice = await this.getStablePrice();

    if (
      marketPrice
        .lessThanOrEqual(UInt224.from(95e17))
        .or(marketPrice.greaterThanOrEqual(UInt224.from(105e18)))
        .toBoolean()
    ) {
      await this.lockSystem();
      return Bool(false);
    } else if (
      (await this.systemLocked.get()).value
        .and(marketPrice.greaterThanOrEqual(UInt224.from(99e17)))
        .and(marketPrice.lessThanOrEqual(UInt224.from(101e18)))
        .toBoolean()
    ) {
      await this.unlockSystem();
    }

    return Bool(true);
  }

  /// MINT / BURNS ============================================

  @runtimeMethod() public async mint(
    stablecoinAmount: UInt224,
    minaCollateral: UInt224
  ): Promise<Bool> {
    await this.stablePriceChecks();
    assert((await this.systemLocked.get()).value.not());

    const sender = this.transaction.sender.value;
    const minaUsdRate = await this.getCollateralPriceUsd();
    const requiredCollateral = stablecoinAmount
      .mul(
        UInt224.Safe.fromField((await this.collateralRatio.get()).value.value)
      )
      .div(minaUsdRate);
    if (minaCollateral.greaterThanOrEqual(requiredCollateral).toBoolean()) {
      const fee = stablecoinAmount
        .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
        .div(1e18);

      const mintedAmount = stablecoinAmount.sub(fee);

      const currentFeeCollected = UInt224.Safe.fromField(
        (await this.feeCollected.get()).value.value
      );
      await this.feeCollected.set(currentFeeCollected.add(fee));

      const currentStableBalance =
        UInt224.Safe.fromField(
          (await this.stableBalances.get(sender)).value.value
        ) || UInt224.from(0);
      const currentCollateralBalance =
        UInt224.Safe.fromField(
          (await this.collateralBalances.get(sender)).value.value
        ) || UInt224.from(0);

      this.stableBalances.set(sender, currentStableBalance.add(mintedAmount));
      this.collateralBalances.set(
        sender,
        currentCollateralBalance.add(requiredCollateral)
      );

      this.stableSupply.set(
        UInt224.Safe.fromField((await this.stableSupply.get()).value.value).add(
          mintedAmount
        )
      );
      this.collateralSupply.set(
        UInt224.Safe.fromField(
          (await this.collateralSupply.get()).value.value
        ).add(requiredCollateral)
      );

      return Bool(true);
    }
    return Bool(false);
  }

  @runtimeMethod() public async burn(stablecoinAmount: UInt224): Promise<Bool> {
    await this.stablePriceChecks();
    if ((await this.systemLocked.get()).value) {
      return Bool(false);
    }

    const sender = this.transaction.sender.value;
    const currentBalance =
      UInt224.Safe.fromField(
        (await this.stableBalances.get(sender)).value.value
      ) || UInt224.from(0);

    if (currentBalance >= stablecoinAmount) {
      const fee = stablecoinAmount
        .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
        .div(1e18);

      /// Subtract the stablecoin balance.
      this.stableBalances.set(sender, currentBalance.sub(stablecoinAmount));
      const currentSupply = UInt224.Safe.fromField(
        (await this.stableSupply.get()).value.value
      );
      /// Remove the sent-fee from circulation
      this.stableSupply.set(currentSupply.sub(stablecoinAmount.sub(fee)));

      const currentFeeCollected = UInt224.Safe.fromField(
        (await this.feeCollected.get()).value.value
      );
      await this.feeCollected.set(currentFeeCollected.add(fee));

      const toReleaseCollateral = await this.getReleasableCollateral(
        stablecoinAmount,
        fee
      );
      // this.distributeFees(fee);
      return Bool(true);
    }
    return Bool(false);
  }

  @runtimeMethod() public async transfer(
    to: PublicKey,
    amount: UInt224
  ): Promise<boolean> {
    return true;
  }
}
