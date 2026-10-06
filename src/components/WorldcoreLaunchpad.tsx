import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Download,
  Code2,
  Calculator,
  Lock,
  Flame,
  Coins,
  ExternalLink,
  AlertTriangle,
  Terminal,
  Rocket
} from 'lucide-react';

const WORLDCORE_BNB_LAUNCH_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WorldcoreBNBLaunch is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant MAX_TAX = 25;

    bool public paused;
    bool public tradingEnabled;
    uint256 public launchTimestamp;
    uint256 public antiBotWindow = 1 hours;

    uint256 public buyTax = 5;
    uint256 public sellTax = 8;
    uint256 public transferTax = 0;

    uint256 public marketingTaxShare = 50;
    uint256 public liquidityTaxShare = 30;
    uint256 public burnTaxShare = 20;

    uint256 public maxBuyAmount = 20_000_000 * 10**18;
    uint256 public maxSellAmount = 10_000_000 * 10**18;
    uint256 public maxWalletAmount = 50_000_000 * 10**18;

    address public marketingWallet;
    address public liquidityWallet;
    address public pairAddress;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 released;
        uint256 start;
        uint256 cliff;
        uint256 duration;
        uint256 interval;
        bool active;
    }

    struct LiquidityLock {
        uint256 totalAmount;
        uint256 released;
        uint256 unlockTime;
        bool active;
    }

    mapping(address => bool) public blacklist;
    mapping(address => bool) public taxExempt;
    mapping(address => bool) public limitExempt;
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => LiquidityLock) public liquidityLocks;

    event TaxesUpdated(uint256 buyTax, uint256 sellTax, uint256 transferTax);
    event TaxAllocationsUpdated(uint256 marketing, uint256 liquidity, uint256 burn);
    event LimitsUpdated(uint256 maxBuy, uint256 maxSell, uint256 maxWallet);
    event TradingEnabled(uint256 timestamp);
    event MarketingWalletUpdated(address indexed wallet);
    event LiquidityWalletUpdated(address indexed wallet);
    event PairAddressUpdated(address indexed pair);
    event Blacklisted(address indexed user, bool status);
    event TeamVestingCreated(address indexed beneficiary, uint256 amount, uint256 start, uint256 cliff, uint256 duration, uint256 interval);
    event TeamVestingReleased(address indexed beneficiary, uint256 amount);
    event LiquidityLocked(address indexed locker, uint256 amount, uint256 unlockTime);
    event LiquidityReleased(address indexed locker, uint256 amount);

    constructor(address _marketingWallet, address _liquidityWallet)
        ERC20("Worldcore", "WCORE")
        Ownable(msg.sender)
    {
        require(_marketingWallet != address(0), "Marketing wallet cannot be zero");

        marketingWallet = _marketingWallet;
        liquidityWallet = _liquidityWallet == address(0) ? msg.sender : _liquidityWallet;

        taxExempt[msg.sender] = true;
        taxExempt[marketingWallet] = true;
        taxExempt[liquidityWallet] = true;
        taxExempt[address(this)] = true;
        taxExempt[DEAD] = true;

        limitExempt[msg.sender] = true;
        limitExempt[marketingWallet] = true;
        limitExempt[liquidityWallet] = true;
        limitExempt[address(this)] = true;
        limitExempt[DEAD] = true;

        _mint(msg.sender, TOTAL_SUPPLY);
    }

    modifier notPaused() {
        require(!paused, "Token paused");
        _;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        launchTimestamp = block.timestamp;
        emit TradingEnabled(block.timestamp);
    }

    function setMarketingWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        marketingWallet = _wallet;
        taxExempt[_wallet] = true;
        limitExempt[_wallet] = true;
        emit MarketingWalletUpdated(_wallet);
    }

    function setLiquidityWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        liquidityWallet = _wallet;
        taxExempt[_wallet] = true;
        limitExempt[_wallet] = true;
        emit LiquidityWalletUpdated(_wallet);
    }

    function setPairAddress(address _pair) external onlyOwner {
        require(_pair != address(0), "Invalid pair");
        if (pairAddress != address(0)) {
            limitExempt[pairAddress] = false;
        }
        pairAddress = _pair;
        taxExempt[_pair] = false;
        limitExempt[_pair] = true;
        emit PairAddressUpdated(_pair);
    }

    function setTaxes(uint256 _buyTax, uint256 _sellTax, uint256 _transferTax) external onlyOwner {
        require(_buyTax <= MAX_TAX && _sellTax <= MAX_TAX && _transferTax <= MAX_TAX, "Tax above max");
        buyTax = _buyTax;
        sellTax = _sellTax;
        transferTax = _transferTax;
        emit TaxesUpdated(_buyTax, _sellTax, _transferTax);
    }

    function setTaxDistribution(uint256 _marketing, uint256 _liquidity, uint256 _burn) external onlyOwner {
        require(_marketing + _liquidity + _burn == 100, "Distribution must equal 100");
        marketingTaxShare = _marketing;
        liquidityTaxShare = _liquidity;
        burnTaxShare = _burn;
        emit TaxAllocationsUpdated(_marketing, _liquidity, _burn);
    }

    function setLimits(uint256 _maxBuy, uint256 _maxSell, uint256 _maxWallet) external onlyOwner {
        require(_maxBuy > 0 && _maxSell > 0 && _maxWallet > 0, "Limits must be > 0");
        maxBuyAmount = _maxBuy;
        maxSellAmount = _maxSell;
        maxWalletAmount = _maxWallet;
        emit LimitsUpdated(_maxBuy, _maxSell, _maxWallet);
    }

    function setBlacklist(address user, bool status) external onlyOwner {
        require(user != owner() && user != pairAddress && user != address(this), "Cannot blacklist protected address");
        blacklist[user] = status;
        emit Blacklisted(user, status);
    }

    function setTaxExempt(address user, bool status) external onlyOwner {
        taxExempt[user] = status;
    }

    function setLimitExempt(address user, bool status) external onlyOwner {
        limitExempt[user] = status;
    }

    function createTeamVesting(
        address beneficiary,
        uint256 amount,
        uint256 start,
        uint256 cliff,
        uint256 duration,
        uint256 interval
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(interval > 0 && duration >= interval, "Invalid interval");
        require(cliff <= duration, "Cliff exceeds duration");
        require(!vestingSchedules[beneficiary].active, "Schedule exists");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 startTime = start == 0 ? block.timestamp : start;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            released: 0,
            start: startTime,
            cliff: cliff,
            duration: duration,
            interval: interval,
            active: true
        });

        _update(msg.sender, address(this), amount);
        emit TeamVestingCreated(beneficiary, amount, startTime, cliff, duration, interval);
    }

    function releaseTeamVesting(address beneficiary) external nonReentrant {
        require(vestingSchedules[beneficiary].active, "No vesting schedule");
        require(!blacklist[beneficiary], "Beneficiary blacklisted");
        VestingSchedule storage schedule = vestingSchedules[beneficiary];

        uint256 vested = _vestedAmount(schedule);
        uint256 releasable = vested - schedule.released;

        require(releasable > 0, "Nothing to release");

        schedule.released += releasable;
        if (schedule.released >= schedule.totalAmount) {
            schedule.active = false;
        }

        _update(address(this), beneficiary, releasable);

        emit TeamVestingReleased(beneficiary, releasable);
    }

    function lockLiquidity(uint256 amount, uint256 unlockTime) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        require(balanceOf(msg.sender) >= amount, "Not enough tokens");
        require(!liquidityLocks[owner()].active, "Active lock already exists");

        liquidityLocks[owner()] = LiquidityLock({
            totalAmount: amount,
            released: 0,
            unlockTime: unlockTime,
            active: true
        });

        _update(msg.sender, address(this), amount);
        emit LiquidityLocked(msg.sender, amount, unlockTime);
    }

    function releaseLiquidity() external onlyOwner nonReentrant {
        LiquidityLock storage lock = liquidityLocks[owner()];
        require(lock.active, "No liquidity lock");
        require(block.timestamp >= lock.unlockTime, "Lock not expired");

        uint256 releasable = lock.totalAmount - lock.released;
        require(releasable > 0, "Nothing to release");

        lock.released += releasable;
        if (lock.released >= lock.totalAmount) {
            lock.active = false;
        }

        _update(address(this), owner(), releasable);

        emit LiquidityReleased(msg.sender, releasable);
    }

    function burn(uint256 value) public override notPaused {
        require(!blacklist[_msgSender()], "Blacklisted");
        super.burn(value);
    }

    function burnFrom(address account, uint256 value) public override notPaused {
        require(!blacklist[_msgSender()] && !blacklist[account], "Blacklisted");
        super.burnFrom(account, value);
    }

    function transfer(address to, uint256 amount) public override notPaused returns (bool) {
        _transferWithTax(_msgSender(), to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override notPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transferWithTax(from, to, amount);
        return true;
    }

    function _transferWithTax(address from, address to, uint256 amount) internal nonReentrant {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        require(!blacklist[from] && !blacklist[to], "Blacklisted");

        if (!tradingEnabled && !taxExempt[from] && !taxExempt[to]) {
            revert("Trading not enabled");
        }

        uint256 taxAmount = _calculateTax(from, to, amount);
        uint256 transferAmount = amount - taxAmount;

        _enforceAntiBot(from, to, amount, transferAmount);

        if (taxAmount > 0) {
            uint256 marketingAmount = (taxAmount * marketingTaxShare) / 100;
            uint256 liquidityAmount = (taxAmount * liquidityTaxShare) / 100;
            uint256 burnAmount = taxAmount - marketingAmount - liquidityAmount;

            if (marketingAmount > 0) {
                _update(from, marketingWallet, marketingAmount);
            }

            if (liquidityAmount > 0) {
                _update(from, liquidityWallet, liquidityAmount);
            }

            if (burnAmount > 0) {
                _update(from, DEAD, burnAmount);
            }
        }

        _update(from, to, transferAmount);
    }

    function _calculateTax(address from, address to, uint256 amount) internal view returns (uint256) {
        if (taxExempt[from] || taxExempt[to]) {
            return 0;
        }

        if (to == pairAddress && pairAddress != address(0)) {
            return (amount * sellTax) / 100;
        }

        if (from == pairAddress && pairAddress != address(0)) {
            return (amount * buyTax) / 100;
        }

        return (amount * transferTax) / 100;
    }

    function _enforceAntiBot(address from, address to, uint256 grossAmount, uint256 netAmount) internal view {
        if (launchTimestamp == 0 || block.timestamp > launchTimestamp + antiBotWindow) {
            return;
        }

        if (!limitExempt[to] && to != pairAddress && to != DEAD) {
            require(balanceOf(to) + netAmount <= maxWalletAmount, "Wallet limit exceeded");
        }

        if (from == pairAddress && !limitExempt[to]) {
            require(grossAmount <= maxBuyAmount, "Buy limit exceeded");
        }

        if (to == pairAddress && !limitExempt[from]) {
            require(grossAmount <= maxSellAmount, "Sell limit exceeded");
        }
    }

    function vestedAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (!schedule.active) return schedule.released;
        return _vestedAmount(schedule);
    }

    function _vestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.start + schedule.cliff) {
            return 0;
        }

        uint256 elapsed = block.timestamp - schedule.start;
        uint256 totalDuration = schedule.duration;

        if (elapsed >= totalDuration) {
            return schedule.totalAmount;
        }

        uint256 effectiveElapsed = (elapsed / schedule.interval) * schedule.interval;
        uint256 vested = (schedule.totalAmount * effectiveElapsed) / totalDuration;

        if (vested > schedule.totalAmount) {
            return schedule.totalAmount;
        }

        return vested;
    }
}`;

const HARDHAT_CONFIG_JS = `require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const rawKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
const formattedKey = rawKey
  ? rawKey.startsWith("0x")
    ? rawKey
    : \`0x\${rawKey}\`
  : "";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: formattedKey ? [formattedKey] : []
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: formattedKey ? [formattedKey] : []
    }
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  }
};`;

const DEPLOY_SCRIPT_JS = `const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying WorldcoreBNBLaunch with:", deployer.address);

  const marketingWallet = process.env.MARKETING_WALLET || deployer.address;
  const liquidityWallet = process.env.LIQUIDITY_WALLET || deployer.address;

  const WorldcoreBNBLaunch = await ethers.getContractFactory("WorldcoreBNBLaunch");
  const token = await WorldcoreBNBLaunch.deploy(marketingWallet, liquidityWallet);

  await token.waitForDeployment();

  const deployedAddress = await token.getAddress();
  const totalSupply = await token.totalSupply();

  console.log("WorldcoreBNBLaunch deployed to:", deployedAddress);
  console.log("Total supply:", ethers.formatUnits(totalSupply, 18), "WCORE");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;

interface FixItem {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  problem: string;
  solution: string;
}

const AUDIT_FIXES: FixItem[] = [
  {
    title: '1. setPairAddress() Marked DEX Pair as Tax-Exempt (Zero Tax & Pre-Launch Bypass)',
    severity: 'CRITICAL',
    problem:
      'setPairAddress(_pair) set taxExempt[_pair] = true. Because _calculateTax() checks if (taxExempt[from] || taxExempt[to]) return 0, every buy (from == pairAddress) and sell (to == pairAddress) returned 0 tax, and anyone could trade before enableTrading() was called.',
    solution:
      'Set taxExempt[_pair] = false and limitExempt[_pair] = true in setPairAddress() so DEX pool reserves are exempt from wallet caps while properly enforcing buyTax (5%), sellTax (8%), and pre-launch trading locks.'
  },
  {
    title: '2. Reversed Token Flow in createTeamVesting() & releaseTeamVesting()',
    severity: 'CRITICAL',
    problem:
      'createTeamVesting() transferred the full unvested amount directly to beneficiary immediately (_transfer(msg.sender, beneficiary, amount)), and releaseTeamVesting() transferred tokens backward from beneficiary to owner().',
    solution:
      'createTeamVesting() now escrows tokens inside address(this), and releaseTeamVesting() releases vested tokens from address(this) to beneficiary.'
  },
  {
    title: '3. _enforceAntiBot() Blocked Owner from Adding Initial Liquidity',
    severity: 'HIGH',
    problem:
      'In _enforceAntiBot(), the to == pairAddress check did not check !limitExempt[from]. Adding >10M WCORE liquidity to PancakeSwap during the anti-bot window reverted with "Sell limit exceeded".',
    solution:
      'Added !limitExempt[to] on buys and !limitExempt[from] on sells so exempt treasury/liquidity wallets can seed and manage DEX liquidity freely.'
  },
  {
    title: '4. Division-by-Zero & Truncation in _vestedAmount()',
    severity: 'HIGH',
    problem:
      'If duration < interval, (totalDuration / schedule.interval) evaluated to 0, causing a division-by-zero panic revert.',
    solution:
      'Added require(interval > 0 && duration >= interval) and require(cliff <= duration) in createTeamVesting(), and replaced nested division with safe effectiveElapsed math.'
  },
  {
    title: '5. lockLiquidity() Overwrote Active Locks & Trapped Tokens',
    severity: 'HIGH',
    problem:
      'Calling lockLiquidity() while a lock was already active overwrote liquidityLocks[owner()], permanently stranding the previously locked tokens inside the contract.',
    solution:
      'Added require(!liquidityLocks[owner()].active) and automatically reset lock.active = false when all locked tokens are released.'
  },
  {
    title: '6. ERC20Burnable burn() & burnFrom() Bypassed Pause and Blacklist',
    severity: 'MEDIUM',
    problem:
      'Inherited burn() and burnFrom() called _burn() directly without checking notPaused or blacklist status.',
    solution:
      'Overrode burn() and burnFrom() with notPaused and blacklist checks, and protected owner/pair/contract from accidental blacklisting.'
  }
];

export function WorldcoreLaunchpad() {
  const [selectedFile, setSelectedFile] = useState<'contract' | 'hardhat' | 'deploy'>('contract');
  const [copied, setCopied] = useState(false);

  // Interactive Tax & Anti-Bot Simulator state
  const [simType, setSimType] = useState<'buy' | 'sell' | 'transfer'>('buy');
  const [simAmount, setSimAmount] = useState('1000000');

  const parsedAmount = Math.max(0, parseFloat(simAmount) || 0);
  const taxRate = simType === 'buy' ? 5 : simType === 'sell' ? 8 : 0;
  const totalTax = (parsedAmount * taxRate) / 100;
  const marketingShare = totalTax * 0.5;
  const liquidityShare = totalTax * 0.3;
  const burnShare = totalTax * 0.2;
  const netReceived = parsedAmount - totalTax;

  const exceedsAntiBotLimit =
    (simType === 'buy' && parsedAmount > 20_000_000) ||
    (simType === 'sell' && parsedAmount > 10_000_000);

  const activeCode =
    selectedFile === 'contract'
      ? WORLDCORE_BNB_LAUNCH_SOL
      : selectedFile === 'hardhat'
      ? HARDHAT_CONFIG_JS
      : DEPLOY_SCRIPT_JS;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      selectedFile === 'contract'
        ? 'WorldcoreBNBLaunch.sol'
        : selectedFile === 'hardhat'
        ? 'hardhat.config.js'
        : 'deploy.js';
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-yellow-500 uppercase tracking-wider">
            <Rocket className="w-4 h-4" />
            <span>BNB Smart Chain (BEP-20) · Solidity ^0.8.20 · OpenZeppelin v5.0</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Worldcore (WCORE) Launchpad & Contract Studio
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Audited and repaired <code className="text-yellow-500 font-mono">WorldcoreBNBLaunch</code> &{' '}
            <code className="text-yellow-500 font-mono">WorldcoreBEP20</code> smart contracts with automated tax routing,
            anti-bot protection, team token vesting, and on-chain liquidity locks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleCopy}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-10 px-4"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied to Clipboard' : 'Copy Fixed Contract'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>

      {/* Key Tokenomics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase">Total Supply</div>
          <div className="text-2xl font-black text-zinc-100 mt-1 font-mono">1,000,000,000</div>
          <div className="text-xs text-zinc-400 mt-1">WCORE · 18 Decimals</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase">Tax Structure</div>
          <div className="text-2xl font-black text-yellow-500 mt-1 font-mono">5% Buy / 8% Sell</div>
          <div className="text-xs text-zinc-400 mt-1">0% P2P Transfer · 25% Hard Cap</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase">Tax Allocation</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">50% / 30% / 20%</div>
          <div className="text-xs text-zinc-400 mt-1">Marketing · Liquidity · Auto-Burn</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase">Anti-Bot Limits (1h)</div>
          <div className="text-2xl font-black text-zinc-100 mt-1 font-mono">2% / 1% / 5%</div>
          <div className="text-xs text-zinc-400 mt-1">20M Buy · 10M Sell · 50M Wallet</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Audit Fixes & Tax Simulator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Tax & Anti-Bot Simulator */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-yellow-500" />
                WCORE Tax & Anti-Bot Simulator
              </h2>
              <span className="text-xs font-mono text-zinc-500">Live Math</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {(['buy', 'sell', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSimType(t)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-colors ${
                    simType === t
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t} ({t === 'buy' ? '5%' : t === 'sell' ? '8%' : '0%'})
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Transaction Amount (WCORE)
              </label>
              <Input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="bg-zinc-900 border-zinc-800 font-mono text-zinc-100 h-11"
                placeholder="1000000"
              />
            </div>

            {exceedsAntiBotLimit && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Anti-Bot Guard Triggered:</strong> During the first 1 hour after{' '}
                  <code className="font-mono">enableTrading()</code>, non-exempt{' '}
                  {simType === 'buy' ? 'buys above 20,000,000 WCORE' : 'sells above 10,000,000 WCORE'} will revert.
                </div>
              </div>
            )}

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Gross Amount:</span>
                <span className="text-zinc-100 font-bold">{parsedAmount.toLocaleString()} WCORE</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Tax ({taxRate}%):</span>
                <span className="text-yellow-500 font-bold">-{totalTax.toLocaleString()} WCORE</span>
              </div>
              <div className="pl-3 border-l border-zinc-800 space-y-1 text-[11px] text-zinc-500">
                <div className="flex justify-between">
                  <span>→ Marketing Wallet (50%):</span>
                  <span>{marketingShare.toLocaleString()} WCORE</span>
                </div>
                <div className="flex justify-between">
                  <span>→ Liquidity Wallet (30%):</span>
                  <span>{liquidityShare.toLocaleString()} WCORE</span>
                </div>
                <div className="flex justify-between">
                  <span>→ Dead Burn 0x...dEaD (20%):</span>
                  <span className="text-orange-400">{burnShare.toLocaleString()} WCORE</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm">
                <span className="text-zinc-300 font-sans font-bold">Net Recipient Receives:</span>
                <span className="text-emerald-400 font-bold">{netReceived.toLocaleString()} WCORE</span>
              </div>
            </div>
          </div>

          {/* Audit Report Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Fixed Smart Contract Errors (6/6 Resolved)
              </h2>
            </div>

            <div className="space-y-3">
              {AUDIT_FIXES.map((fix, i) => (
                <div key={i} className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-100">{fix.title}</span>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 shrink-0">FIXED</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{fix.problem}</p>
                  <p className="text-xs text-emerald-400/90 leading-relaxed font-medium">✓ {fix.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Fixed Source Code Viewer */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col flex-1">
            <div className="border-b border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50">
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedFile('contract')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedFile === 'contract'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  WorldcoreBNBLaunch.sol
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFile('hardhat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedFile === 'hardhat'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  hardhat.config.js
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFile('deploy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedFile === 'deploy'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  scripts/deploy.js
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs h-8"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-black/80 overflow-x-auto overflow-y-auto max-h-[760px] flex-1">
              <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
                <code>{activeCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
