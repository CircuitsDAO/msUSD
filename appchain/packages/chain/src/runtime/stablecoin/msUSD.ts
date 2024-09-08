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
import { UInt224, UInt64 } from "@proto-kit/library";
import { PublicKey, Field, Bool, Provable } from "o1js";

export interface StableConfig {}

@runtimeModule()
export class msUSD extends RuntimeModule<StableConfig> {
  @state() public stableBalances = StateMap.from(PublicKey, UInt224);
  @state() public stableSupply = State.from(UInt224);
  @state() public collateralBalances = StateMap.from(PublicKey, UInt224);
  @state() public collateralSupply = State.from(UInt224);

  @state() public lastMintedAtBlock = StateMap.from(PublicKey, UInt64);

  /// UPDATED REGULARLY BY THE DAO'S MULTISIG
  @state() public collateralPrice = State.from(UInt224);

  @state() public collateralRatio = State.from(UInt224);

  @state() public CircuitsDAO = State.from(PublicKey);

  /// FOR FAULT TOLERENCE AND EMERGENCY DEPEGS
  // (Field(0)): System is unlocked
  // (Field(1)): System is locked
  @state() public systemLocked = State.from(Field);

  @state() public fee = State.from(UInt224);
  @state() public stableFeeCollected = State.from(UInt224);
  @state() public collateralFeeCollected = State.from(UInt224);

  @state() public decimals = State.from(UInt224);
  @state() public treasuryStableAmount = State.from(UInt224);
  @state() public treasuryCollateralAmount = State.from(UInt224);
  @state() public emergencyStableAmount = State.from(UInt224);
  @state() public emergencyCollateralAmount = State.from(UInt224);

  @state() public stabilityPoolMina = State.from(UInt224);
  @state() public stabilityPoolMinaBalances = StateMap.from(PublicKey, UInt224);
  @state() public stabilityPoolStable = State.from(UInt224);
  @state() public stabilityPoolStablecoinBalances = StateMap.from(
    PublicKey,
    UInt224
  );
  @state() public rewardPool = State.from(UInt224);
  @state() public baseRewardRate = State.from(UInt224);

  /// SETTER METHODS ==============================================
  /// @param toSetRatio - Default is 15-

  @runtimeMethod() public async start(
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

    this.CircuitsDAO.set(this.transaction.sender.value);
    this.collateralRatio.set(UInt224.from(15e19));
    this.decimals.set(UInt224.from(1e18));
    this.fee.set(UInt224.from(5e16));
    this.baseRewardRate.set(UInt224.from(5e16));

    this.systemLocked.set(Field.from(0));
    this.stableSupply.set(zero);
    this.collateralSupply.set(zero);
    this.stableFeeCollected.set(zero);
    this.collateralFeeCollected.set(zero);
    this.treasuryStableAmount.set(zero);
    this.treasuryCollateralAmount.set(zero);
    this.emergencyCollateralAmount.set(zero);
    this.emergencyStableAmount.set(zero);
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

  @runtimeMethod()
  public async distributeFee(): Promise<void> {
    const stableFee = UInt224.Safe.fromField(
      (await this.stableFeeCollected.get()).value.value
    );
    const collateralFee = UInt224.Safe.fromField(
      (await this.collateralFeeCollected.get()).value.value
    );

    const SCALE = UInt224.from(1e18);
    const TREASURY_SHARE = UInt224.from(5e16); // 5% in 1e18 scale

    const treasuryStableShare = stableFee.mul(TREASURY_SHARE).div(SCALE);
    const emergencyStableShare = stableFee.sub(treasuryStableShare);

    const treasuryCollateralShare = collateralFee
      .mul(TREASURY_SHARE)
      .div(SCALE);
    const emergencyCollateralShare = collateralFee.sub(treasuryCollateralShare);

    const currentTreasuryStable = UInt224.Safe.fromField(
      (await this.treasuryStableAmount.get()).value.value
    );
    const currentTreasuryCollateral = UInt224.Safe.fromField(
      (await this.treasuryCollateralAmount.get()).value.value
    );
    this.treasuryStableAmount.set(
      currentTreasuryStable.add(treasuryStableShare)
    );
    this.treasuryCollateralAmount.set(
      currentTreasuryCollateral.add(treasuryCollateralShare)
    );

    const currentEmergencyStable = UInt224.Safe.fromField(
      (await this.emergencyStableAmount.get()).value.value
    );
    const currentEmergencyCollateral = UInt224.Safe.fromField(
      (await this.emergencyCollateralAmount.get()).value.value
    );
    this.emergencyStableAmount.set(
      currentEmergencyStable.add(emergencyStableShare)
    );
    this.emergencyCollateralAmount.set(
      currentEmergencyCollateral.add(emergencyCollateralShare)
    );

    this.stableFeeCollected.set(UInt224.from(0));
    this.collateralFeeCollected.set(UInt224.from(0));
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
    const scaleFactor = UInt224.from(1e18);

    const calculated = UInt224.from(
      totalCollateralValueUsd
        .mul(scaleFactor)
        .div(
          UInt224.Safe.fromField((await this.stableSupply.get()).value.value)
        )
    );

    let toSet = Provable.if(
      (await this.stableSupply.get()).value.value.equals(Field.from(0)),
      Field.from(1e18),
      UInt224.toFields(calculated)[0]
    );

    return UInt224.Safe.fromField(toSet);
  }

  @runtimeMethod()
  public async getReleasableCollateral(
    stablecoinAmount: UInt224,
    fee: UInt224
  ): Promise<[UInt224, UInt224]> {
    const burnedAmount = stablecoinAmount.sub(fee);
    const totalCollateral = UInt224.Safe.fromField(
      (await this.collateralSupply.get()).value.value
    );
    const totalStableSupply = UInt224.Safe.fromField(
      (await this.stableSupply.get()).value.value
    );
    const collateralPrice = await this.getCollateralPriceUsd();

    const releaseRatio = burnedAmount.div(totalStableSupply);
    const totalReleasableCollateral = totalCollateral.mul(releaseRatio);

    const collateralToRelease = burnedAmount
      .mul(UInt224.from(1e18))
      .div(collateralPrice);

    const collateralToHoldBack =
      totalReleasableCollateral.sub(collateralToRelease);

    return [collateralToRelease, collateralToHoldBack];
  }
  /// CORE FUNCTIONS ==============================================

  /// LOCKS ===============================================
  /// CRITERIA FOR LOCKS AND UNLOCKS :
  /// LOCKS - THE PRICE DEPEGS ABOVE $1.05 OR BELOW $0.95
  /// UNLOCKS - THE PRICE COMES BACK TO BELOW $1.01 OR ABOVE $0.99

  @runtimeMethod() async stablePriceChecks(): Promise<void> {
    const marketPrice = await this.getStablePrice();
    const isSystemLocked = (await this.systemLocked.get()).value.equals(
      Field(1)
    );

    // Check if price is out of range (lock condition)
    const shouldLock = marketPrice
      .lessThanOrEqual(UInt224.from(95e17))
      .or(marketPrice.greaterThanOrEqual(UInt224.from(105e18)));

    // Check if price is in stable range and system is currently locked (unlock condition)
    const shouldUnlock = isSystemLocked
      .and(marketPrice.greaterThanOrEqual(UInt224.from(99e17)))
      .and(marketPrice.lessThanOrEqual(UInt224.from(101e18)));

    // Determine the action to take:
    // 0 = do nothing, 1 = lock, 2 = unlock
    const action = Provable.if(
      shouldLock,
      Field(1),
      Provable.if(shouldUnlock, Field(2), Field(0))
    );

    // Execute the action based on the determined value
    const newLockedState = Provable.if(
      action.equals(Field(1)),
      Field(1),
      Provable.if(
        action.equals(Field(2)),
        Field(0),
        (await this.systemLocked.get()).value
      )
    );

    this.systemLocked.set(newLockedState);

    // return Provable.if(
    //   newLockedState.equals(Field(1)),
    //   Bool(false),
    //   Bool(true)
    // );
  }

  /// MINT / BURNS ============================================

  @runtimeMethod() public async mint(
    stablecoinAmount: UInt224,
    minaCollateral: UInt224
  ): Promise<Bool> {
    await this.stablePriceChecks();
    (await this.systemLocked.get()).value.assertNotEquals(Field.from(1));

    assert(
      stablecoinAmount
        .greaterThan(UInt224.from(0))
        .and(minaCollateral.greaterThan(UInt224.from(0)))
    );

    const sender = this.transaction.sender.value;
    const minaUsdRate = await this.getCollateralPriceUsd();
    const requiredCollateral = stablecoinAmount
      .mul(
        UInt224.Safe.fromField((await this.collateralRatio.get()).value.value)
      )
      .div(minaUsdRate);

    assert(minaCollateral.greaterThanOrEqual(requiredCollateral));

    const fee = stablecoinAmount
      .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
      .div(1e18);

    const mintedAmount = stablecoinAmount.sub(fee);

    const currentFeeCollected = UInt224.Safe.fromField(
      (await this.stableFeeCollected.get()).value.value
    );
    await this.stableFeeCollected.set(currentFeeCollected.add(fee));

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

    this.lastMintedAtBlock.set(sender, this.network.block.height);

    return Bool(true);
  }

  @runtimeMethod() public async burn(stablecoinAmount: UInt224): Promise<Bool> {
    await this.stablePriceChecks();
    (await this.systemLocked.get()).value.assertNotEquals(Field.from(1));

    const sender = this.transaction.sender.value;
    const currentBalance =
      UInt224.Safe.fromField(
        (await this.stableBalances.get(sender)).value.value
      ) || UInt224.from(0);

    currentBalance.assertGreaterThanOrEqual(stablecoinAmount);

    assert(
      UInt64.fromValue(this.network.block.height)
        .value.sub((await this.lastMintedAtBlock.get(sender)).value.value)
        .greaterThan(Field.from(1296000)) //15 days
    );

    const fee = stablecoinAmount
      .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
      .div(1e18);

    this.stableBalances.set(sender, currentBalance.sub(stablecoinAmount));
    const currentSupply = UInt224.Safe.fromField(
      (await this.stableSupply.get()).value.value
    );

    this.stableSupply.set(currentSupply.sub(stablecoinAmount.sub(fee)));
    const currentFeeCollected = UInt224.Safe.fromField(
      (await this.stableFeeCollected.get()).value.value
    );
    this.stableFeeCollected.set(currentFeeCollected.add(fee));

    const [toReleaseCollateral, toHoldBack] =
      await this.getReleasableCollateral(stablecoinAmount, fee);

    const currentCollateralBalance =
      UInt224.Safe.fromField(
        (await this.collateralBalances.get(sender)).value.value
      ) || UInt224.from(0);
    this.collateralBalances.set(
      sender,
      currentCollateralBalance.sub(toReleaseCollateral)
    );

    const currentCollateralSupply = UInt224.Safe.fromField(
      (await this.collateralSupply.get()).value.value
    );
    this.collateralSupply.set(
      currentCollateralSupply.sub(toReleaseCollateral.add(toHoldBack))
    );

    const currentCollateralFeeCollected = UInt224.Safe.fromField(
      (await this.collateralFeeCollected.get()).value.value
    );
    this.collateralFeeCollected.set(
      currentCollateralFeeCollected.add(toHoldBack)
    );

    return Bool(true);
  }

  @runtimeMethod()
  public async transfer(to: PublicKey, amount: UInt224): Promise<Bool> {
    // Check if the system is locked
    (await this.systemLocked.get()).value.assertNotEquals(Field.from(1));

    const sender = this.transaction.sender.value;

    // Get sender's current balance
    const senderBalance =
      UInt224.Safe.fromField(
        (await this.stableBalances.get(sender)).value.value
      ) || UInt224.from(0);

    // Ensure sender has sufficient balance
    senderBalance.assertGreaterThanOrEqual(amount);

    // Get recipient's current balance
    const recipientBalance =
      UInt224.Safe.fromField((await this.stableBalances.get(to)).value.value) ||
      UInt224.from(0);

    // Calculate fee
    const fee = amount
      .mul(UInt224.Safe.fromField((await this.fee.get()).value.value))
      .div(UInt224.from(1e18));

    // Calculate amount after fee
    const amountAfterFee = amount.sub(fee);

    // Update sender's balance
    this.stableBalances.set(sender, senderBalance.sub(amount));

    // Update recipient's balance
    this.stableBalances.set(to, recipientBalance.add(amountAfterFee));

    // Update fee collection
    const currentFeeCollected = UInt224.Safe.fromField(
      (await this.stableFeeCollected.get()).value.value
    );
    this.stableFeeCollected.set(currentFeeCollected.add(fee));

    // Return success
    return Bool(true);
  }

  // / IN CASES OF DEPEGS
  @runtimeMethod() public async stabilize(): Promise<void> {
    const marketPrice = await this.getStablePrice();
    const isLower = marketPrice.lessThan(UInt224.from(95e17));
    const isHigher = marketPrice.greaterThan(UInt224.from(105e16));

    await this.stabilizeLowPrice(isLower);
    // TODO RN
    // await this.stabilizeHighPrice(isHigher);
  }

  @runtimeMethod() private async stabilizeLowPrice(
    isLower: Bool
  ): Promise<void> {
    const poolStable = (await this.stabilityPoolStable.get()).value.value;
    const factor = Field.from(
      UInt224.Safe.fromField((await this.stableSupply.get()).value.value)
        .div(UInt224.from(10))
        .toBigInt()
    );

    /// The pool of stablecoins is emptied and the same is done to the supply that is equal amounts removed.
    const burnAmount = Provable.if(
      poolStable.lessThanOrEqual(factor),
      poolStable,
      factor
    );

    this.stableSupply.set(
      UInt224.Safe.fromField(
        (await this.stableSupply.get()).value.value.sub(burnAmount)
      )
    );
    this.stabilityPoolStable.set(
      UInt224.Safe.fromField(
        (await this.stabilityPoolStable.get()).value.value.sub(burnAmount)
      )
    );

    const priceDeviation = UInt224.from(1e18).sub(await this.getStablePrice());
    const dynamicRewardRate = UInt224.Safe.fromField(
      (await this.baseRewardRate.get()).value.value
    ).add(
      UInt224.Safe.fromField((await this.baseRewardRate.get()).value.value)
        .mul(priceDeviation)
        .div(BigInt(1e18))
    );
    const rewardAmount =
      UInt224.Safe.fromField(burnAmount).mul(dynamicRewardRate);
    this.rewardPool.set(
      UInt224.Safe.fromField((await this.rewardPool.get()).value.value).add(
        rewardAmount
      )
    );
  }
}
