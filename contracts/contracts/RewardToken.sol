// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title RewardToken
 * @notice ERC-20 governance/reward token minted as a bonus when contributors withdraw payments.
 *         Only authorized minters (escrow contracts) can mint.
 *         UUPS Upgradeable.
 */
contract RewardToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @notice Mapping of addresses allowed to mint (escrow contracts).
    mapping(address => bool) public isMinter;

    /// @notice Reward rate: contributor receives (rewardRate * paymentAmount) / RATE_DENOMINATOR reward tokens.
    uint256 public rewardRate;
    uint256 public constant RATE_DENOMINATOR = 10_000; // basis points

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender], "RewardToken: caller is not a minter");
        _;
    }

    /**
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param initialOwner Protocol admin address
     * @param _rewardRate Initial reward rate in basis points (e.g., 100 = 1%)
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address initialOwner,
        uint256 _rewardRate
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        rewardRate = _rewardRate;
    }

    /// @notice Mint reward tokens. Only callable by authorized escrow contracts.
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /// @notice Calculate reward amount for a given payment amount.
    function calculateReward(uint256 paymentAmount) external view returns (uint256) {
        return (paymentAmount * rewardRate) / RATE_DENOMINATOR;
    }

    // --- Admin functions ---

    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "RewardToken: zero address");
        isMinter[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        isMinter[minter] = false;
        emit MinterRemoved(minter);
    }

    function setRewardRate(uint256 _newRate) external onlyOwner {
        emit RewardRateUpdated(rewardRate, _newRate);
        rewardRate = _newRate;
    }

    /// @notice Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
