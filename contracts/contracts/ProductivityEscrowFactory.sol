// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./ProductivityEscrow.sol";
import "./RewardToken.sol";

/**
 * @title ProductivityEscrowFactory
 * @notice Deploys and registers per-project ProductivityEscrow instances.
 *         Protocol owner manages default settings, allowed oracles, and arbitrators.
 *         UUPS Upgradeable.
 */
contract ProductivityEscrowFactory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // --- State ---
    address public defaultPaymentToken;          // Default ERC-20 (e.g., USDC on Sepolia)
    RewardToken public rewardToken;              // Protocol-wide reward token

    mapping(address => bool) public allowedOracles;
    mapping(address => bool) public allowedArbitrators;

    address[] public escrows;                    // Registry of deployed escrow contracts
    mapping(address => bool) public isEscrow;

    uint256 public defaultDisputeWindow;
    uint256 public defaultOracleTimeout;

    // --- Events ---
    event EscrowCreated(
        address indexed escrow,
        address indexed projectOwner,
        uint256 totalBudget,
        uint256 milestoneCount
    );
    event DefaultPaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event OracleAllowed(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event ArbitratorAllowed(address indexed arbitrator);
    event ArbitratorRevoked(address indexed arbitrator);
    event DefaultDisputeWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event DefaultOracleTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _initialOwner,
        address _defaultPaymentToken,
        address _rewardToken
    ) public initializer {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        require(_defaultPaymentToken != address(0), "Factory: zero payment token");
        defaultPaymentToken = _defaultPaymentToken;
        rewardToken = RewardToken(_rewardToken);
        defaultDisputeWindow = 3 days;
        defaultOracleTimeout = 7 days;
    }

    // --- Escrow deployment ---

    /**
     * @notice Deploy a new ProductivityEscrow for a project.
     * @param _oracle Oracle address (must be allowed)
     * @param _arbitrator Arbitrator address (must be allowed)
     * @param _paymentToken ERC-20 token address (address(0) uses default)
     * @param _contributors List of contributor wallet addresses
     * @param _milestoneBudgets Budget allocation per milestone
     * @param _milestoneDeadlines Deadline per milestone
     * @param _disputeWindow Override dispute window (0 uses default)
     * @param _oracleTimeout Override oracle timeout (0 uses default)
     * @return escrow Address of the deployed escrow
     */
    function createEscrow(
        address _oracle,
        address _arbitrator,
        address _paymentToken,
        address[] calldata _contributors,
        uint256[] calldata _milestoneBudgets,
        uint256[] calldata _milestoneDeadlines,
        uint256 _disputeWindow,
        uint256 _oracleTimeout
    ) external returns (address escrow) {
        require(allowedOracles[_oracle], "Factory: oracle not allowed");
        require(allowedArbitrators[_arbitrator], "Factory: arbitrator not allowed");

        address payToken = _paymentToken == address(0) ? defaultPaymentToken : _paymentToken;
        uint256 dWindow = _disputeWindow > 0 ? _disputeWindow : defaultDisputeWindow;
        uint256 oTimeout = _oracleTimeout > 0 ? _oracleTimeout : defaultOracleTimeout;

        // Compute total budget for approval check
        uint256 _totalBudget = 0;
        for (uint256 i = 0; i < _milestoneBudgets.length; i++) {
            _totalBudget += _milestoneBudgets[i];
        }

        // Transfer tokens from project owner to this contract
        IERC20(payToken).safeTransferFrom(msg.sender, address(this), _totalBudget);

        // Deploy implementation and proxy
        ProductivityEscrow implementation = new ProductivityEscrow();
        
        bytes memory initData = abi.encodeWithSelector(
            ProductivityEscrow.initialize.selector,
            address(this),  // factory is the "funder" for transferFrom
            _oracle,
            _arbitrator,
            payToken,
            address(rewardToken),
            _contributors,
            _milestoneBudgets,
            _milestoneDeadlines,
            dWindow,
            oTimeout
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        ProductivityEscrow newEscrow = ProductivityEscrow(address(proxy));

        // Approve escrow to pull funds
        IERC20(payToken).approve(address(newEscrow), _totalBudget);

        // Register escrow
        escrows.push(address(newEscrow));
        isEscrow[address(newEscrow)] = true;

        // Authorize the escrow as a minter on the reward token
        if (address(rewardToken) != address(0)) {
            rewardToken.addMinter(address(newEscrow));
        }

        emit EscrowCreated(address(newEscrow), msg.sender, _totalBudget, _milestoneBudgets.length);

        return address(newEscrow);
    }

    // --- View functions ---

    function getEscrowCount() external view returns (uint256) {
        return escrows.length;
    }

    function getEscrows() external view returns (address[] memory) {
        return escrows;
    }

    // --- Admin functions ---

    function setDefaultPaymentToken(address _token) external onlyOwner {
        require(_token != address(0), "Factory: zero address");
        emit DefaultPaymentTokenUpdated(defaultPaymentToken, _token);
        defaultPaymentToken = _token;
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        emit RewardTokenUpdated(address(rewardToken), _rewardToken);
        rewardToken = RewardToken(_rewardToken);
    }

    function allowOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Factory: zero address");
        allowedOracles[_oracle] = true;
        emit OracleAllowed(_oracle);
    }

    function revokeOracle(address _oracle) external onlyOwner {
        allowedOracles[_oracle] = false;
        emit OracleRevoked(_oracle);
    }

    function allowArbitrator(address _arbitrator) external onlyOwner {
        require(_arbitrator != address(0), "Factory: zero address");
        allowedArbitrators[_arbitrator] = true;
        emit ArbitratorAllowed(_arbitrator);
    }

    function revokeArbitrator(address _arbitrator) external onlyOwner {
        allowedArbitrators[_arbitrator] = false;
        emit ArbitratorRevoked(_arbitrator);
    }

    function setDefaultDisputeWindow(uint256 _window) external onlyOwner {
        emit DefaultDisputeWindowUpdated(defaultDisputeWindow, _window);
        defaultDisputeWindow = _window;
    }

    function setDefaultOracleTimeout(uint256 _timeout) external onlyOwner {
        emit DefaultOracleTimeoutUpdated(defaultOracleTimeout, _timeout);
        defaultOracleTimeout = _timeout;
    }

    /// @notice Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
