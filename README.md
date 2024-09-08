# POC of Overcollateralized Stablecoin Appchain Module - msUSD - For Mina Protcol

### Capabilities

Minting: Users can mint stablecoins by providing collateral (MINA tokens). The amount of collateral required is determined by the current collateral ratio and the MINA/USD price.

Burning: Users can burn stablecoins to retrieve their collateral, subject to a cooldown period after minting.
Transfer: Users can transfer stablecoins to other addresses.
Price Stabilization: The system includes mechanisms to stabilize the price when it deviates too far from the peg:

For low prices: It burns stablecoins from the stability pool and uses emergency funds (90% of the fee collected)

For high prices: It mints new stablecoins into the stability pool and uses emergency funds (90% of the fee collected).

Liquidity Provision: Users can provide liquidity to the stability pool in the form of MINA tokens or stablecoins.

Liquidity Withdrawal: Users can withdraw their provided liquidity from the stability pool.
Fee Collection: The system collects fees on minting, burning, and transfers, which are distributed between a treasury and an emergency fund.

Dynamic Reward Rate: The system adjusts reward rates based on price deviations to incentivize stabilizing actions.

System Locking: The system can be locked or unlocked based on price conditions to prevent operations during extreme volatility.

### Limitations at the moment

External Price Feed: The system relies on an external price feed for the MINA/USD price, which is updated by the CircuitsDAO. This introduces a centralized point of failure and trust.

No Governance Mechanism: While there's a CircuitsDAO, there's no on-chain governance mechanism for parameter adjustments.
Limited Asset Support: The system only supports MINA as collateral. It doesn't allow for multiple collateral types.

No Partial Collateral Release: When burning stablecoins, users can't partially release collateral; they must burn all their stablecoins.

Fixed Cooldown Period: The 15-day cooldown period after minting is fixed and might be too rigid for some use cases.
No Liquidation Mechanism: There's no automatic liquidation of undercollateralized positions, which could lead to system insolvency in rapid price declines.

### Depeg Tolerance

The system has several mechanisms to handle depegs:

Price-based Stabilization: When the price deviates too far from the peg, the system automatically burns or mints stablecoins to stabilize the price.

Stability Pool: Acts as a buffer for price stabilization actions.

Dynamic Reward Rates: Incentivizes users to take stabilizing actions during price deviations.
System Locking: Prevents operations during extreme volatility.

These mechanisms provide some resilience against depegs, but their effectiveness would depend on market conditions and user behavior.

Using emergency funds to help with the depeg.

### What we didn't cover?

Precision Loss: The frequent use of division operations could lead to precision loss over time. Atm we are at 1e18 precision scale.

Unbounded Mint/Burn in Stabilization: There's no clear limit on how much can be minted or burned in a single stabilization action, which could lead to extreme actions in volatile markets.

Lack of Slippage Protection: Large transfers or liquidity provisions/withdrawals don't account for slippage, which could be exploited.

No Check for Minimum Collateralization: When burning stablecoins, there's no check to ensure the remaining position stays above the minimum collateralization ratio.

Potential Overflow/Underflow: While using UInt224 provides a large range, there are still operations that could potentially overflow or underflow in extreme scenarios.

Centralization Risks: The reliance on CircuitsDAO for price updates and the ability to update critical parameters introduces centralization risks.

## Disclaimer

While we did construct a POC, we were unable to test the implementation at all and would probably require a lot of fine tuning before its usable.
We sincerely apologize we couldn't work out the testing properly due to some technical difficulties and a short window for hacking it together.

# Thank you.

We thank ETHGlobal for this opportunity and pushing all of us to our better version capable of amazing things.

# ==========================================================================================
