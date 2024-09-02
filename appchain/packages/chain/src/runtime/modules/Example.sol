// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// StableCoin: The ERC20 token contract for our stablecoin (unchanged)
contract StableCoin is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

// Oracle: A simple price oracle (unchanged)
contract Oracle is Ownable {
    uint256 public price; // Price of ETH in terms of the stablecoin

    event PriceUpdated(uint256 newPrice);

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
        emit PriceUpdated(_price);
    }

    function getPrice() external view returns (uint256) {
        return price;
    }
}

// Vault: A contract to manage individual vaults (modified for public access)
contract Vault is ReentrancyGuard {
    address public creator;
    uint256 public collateralAmount;
    uint256 public debtAmount;
    address public immutable stableCoin;
    address public immutable oracle;
    address public immutable vaultFactory;

    event Deposited(address indexed depositor, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount);
    event Repaid(address indexed repayer, uint256 amount);
    event Liquidated(
        address indexed liquidator,
        uint256 collateralAmount,
        uint256 debtAmount
    );

    constructor(
        address _creator,
        address _stableCoin,
        address _oracle,
        address _vaultFactory
    ) {
        creator = _creator;
        stableCoin = _stableCoin;
        oracle = _oracle;
        vaultFactory = _vaultFactory;
    }

    function deposit() external payable nonReentrant {
        collateralAmount += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        require(_amount <= collateralAmount, "Insufficient collateral");
        require(isHealthy(), "Vault is unhealthy");

        collateralAmount -= _amount;
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Failed to send ETH");

        require(isHealthy(), "Withdrawal would make vault unhealthy");
        emit Withdrawn(msg.sender, _amount);
    }

    function borrow(uint256 _stableCoinAmount) external nonReentrant {
        require(isHealthy(), "Vault is unhealthy");

        debtAmount += _stableCoinAmount;
        StableCoin(stableCoin).mint(msg.sender, _stableCoinAmount);

        require(isHealthy(), "Borrowing would make vault unhealthy");
        emit Borrowed(msg.sender, _stableCoinAmount);
    }

    function repay(uint256 _stableCoinAmount) external nonReentrant {
        require(
            _stableCoinAmount <= debtAmount,
            "Repayment amount exceeds debt"
        );

        StableCoin(stableCoin).burn(msg.sender, _stableCoinAmount);
        debtAmount -= _stableCoinAmount;
        emit Repaid(msg.sender, _stableCoinAmount);
    }

    function liquidate() external nonReentrant {
        require(!isHealthy(), "Vault is healthy");

        uint256 requiredStableCoin = debtAmount;
        StableCoin(stableCoin).burn(msg.sender, requiredStableCoin);

        uint256 ethToTransfer = collateralAmount;
        uint256 _debtAmount = debtAmount;
        collateralAmount = 0;
        debtAmount = 0;

        (bool sent, ) = payable(msg.sender).call{value: ethToTransfer}("");
        require(sent, "Failed to send ETH");

        VaultFactory(vaultFactory).removeVault(address(this));
        emit Liquidated(msg.sender, ethToTransfer, _debtAmount);
    }

    function isHealthy() public view returns (bool) {
        if (debtAmount == 0) return true;
        uint256 collateralValue = (collateralAmount *
            Oracle(oracle).getPrice()) / 1e18;
        return collateralValue >= (debtAmount * 120) / 100;
    }

    function collateralizationRatio() public view returns (uint256) {
        if (debtAmount == 0) return type(uint256).max;
        uint256 collateralValue = (collateralAmount *
            Oracle(oracle).getPrice()) / 1e18;
        return (collateralValue * 100) / debtAmount;
    }

    receive() external payable {
        collateralAmount += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}

// VaultFactory: A factory contract to create and manage vaults (slightly modified)
contract VaultFactory is Ownable {
    address public immutable stableCoin;
    address public immutable oracle;

    address[] public allVaults;

    event VaultCreated(address indexed creator, address vault);
    event VaultRemoved(address indexed vault);

    constructor(address _stableCoin, address _oracle) {
        stableCoin = _stableCoin;
        oracle = _oracle;
    }

    function createVault() external returns (address) {
        Vault newVault = new Vault(
            msg.sender,
            stableCoin,
            oracle,
            address(this)
        );

        allVaults.push(address(newVault));

        emit VaultCreated(msg.sender, address(newVault));

        return address(newVault);
    }

    function removeVault(address _vault) external {
        require(msg.sender == _vault, "Only vault can remove itself");

        for (uint256 i = 0; i < allVaults.length; i++) {
            if (allVaults[i] == _vault) {
                allVaults[i] = allVaults[allVaults.length - 1];
                allVaults.pop();
                break;
            }
        }

        emit VaultRemoved(_vault);
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }
}

// Liquidator: A contract to manage the liquidation process (unchanged)
contract Liquidator {
    VaultFactory public immutable vaultFactory;
    Oracle public immutable oracle;

    constructor(address _vaultFactory, address _oracle) {
        vaultFactory = VaultFactory(_vaultFactory);
        oracle = Oracle(_oracle);
    }

    function checkAndLiquidateVaults() external {
        address[] memory vaults = vaultFactory.getAllVaults();
        for (uint256 i = 0; i < vaults.length; i++) {
            Vault vault = Vault(vaults[i]);
            if (!vault.isHealthy()) {
                vault.liquidate();
            }
        }
    }

    function getLiquidatableVaults() external view returns (address[] memory) {
        address[] memory allVaults = vaultFactory.getAllVaults();
        address[] memory liquidatableVaults = new address[](allVaults.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allVaults.length; i++) {
            Vault vault = Vault(allVaults[i]);
            if (!vault.isHealthy()) {
                liquidatableVaults[count] = allVaults[i];
                count++;
            }
        }

        // Resize the array to remove empty slots
        assembly {
            mstore(liquidatableVaults, count)
        }

        return liquidatableVaults;
    }
}
