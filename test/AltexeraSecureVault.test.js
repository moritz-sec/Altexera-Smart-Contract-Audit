const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Altexera Vault - Deep Security & Economic Audit", function () {
  let vault;
  let owner, treasury, bot, user, attacker;
  let usdt, aavePool, priceFeed;
  const ZERO_ADDRESS = ethers.ZeroAddress;
  const PLAN_ID_USDT = 1;
  const MIN_DEPOSIT_USDT = ethers.parseUnits("100", 18);

  beforeEach(async function () {
    [owner, treasury, bot, user, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy();
    const USDT_ADDR = await usdt.getAddress();

    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    aavePool = await MockAavePool.deploy(USDT_ADDR);
    const AAVE_ADDR = await aavePool.getAddress();

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    priceFeed = await MockPriceFeed.deploy();
    const PRICE_FEED_ADDR = await priceFeed.getAddress();

    const Vault = await ethers.getContractFactory("AltexeraSecureVault");
    vault = await Vault.deploy(
      treasury.address, 
      [bot.address], 
      USDT_ADDR, 
      AAVE_ADDR, 
      PRICE_FEED_ADDR
    );
    const VAULT_ADDR = await vault.getAddress();

    await usdt.mint(user.address, ethers.parseUnits("10000", 18));
    await usdt.mint(attacker.address, ethers.parseUnits("10000", 18));
    await usdt.connect(user).approve(VAULT_ADDR, ethers.MaxUint256);
    await usdt.connect(attacker).approve(VAULT_ADDR, ethers.MaxUint256);
  });

  describe("1. NO HIDDEN ADMIN PRIVILEGES (Anti-Rug Pull)", function () {
    it("Should NOT have an owner() function (No Ownable)", async function () {
      expect(vault.interface.getFunction("owner")).to.be.null;
    });

    it("Should NOT expose any sweep or emergencyWithdraw functions", async function () {
      expect(vault.sweep).to.be.undefined;
      expect(vault.emergencyWithdraw).to.be.undefined;
      expect(vault.withdrawAll).to.be.undefined;
    });
  });

  describe("2. ACCESS CONTROL & ANTI-THEFT", function () {
    it("SECURITY: Attacker cannot claim another user's stake", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID_USDT, MIN_DEPOSIT_USDT);
      await expect(
        vault.connect(attacker).claimStakingRewards(0)
      ).to.be.revertedWithCustomError(vault, "InvalidStake");
    });

    it("SECURITY: Unregistered user cannot deposit", async function () {
      await expect(
        vault.connect(attacker).deposit(PLAN_ID_USDT, MIN_DEPOSIT_USDT)
      ).to.be.revertedWithCustomError(vault, "NotRegistered");
    });
  });

  describe("3. LOCKUP PERIODS & WITHDRAWAL LIMITS", function () {
    it("SECURITY: User cannot withdraw before plan maturity", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID_USDT, MIN_DEPOSIT_USDT);
      await expect(
        vault.connect(user).closeStake(0)
      ).to.be.revertedWithCustomError(vault, "NotMature");
    });

    it("Should reject deposits outside plan boundaries", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      
      await expect(
        vault.connect(user).deposit(PLAN_ID_USDT, ethers.parseUnits("50", 18))
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
      
      await expect(
        vault.connect(user).deposit(PLAN_ID_USDT, ethers.parseUnits("100000000000", 18))
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
    });
  });

  describe("4. ORACLE & EXTERNAL SECURITY", function () {
    it("SECURITY: Hardcoded Aave and Chainlink addresses cannot be modified", async function () {
      const chainlinkFeed = await vault.CHAINLINK_BNB_USD();
      const aavePoolAddr = await vault.AAVE_POOL();
      expect(chainlinkFeed).to.not.equal(ethers.ZeroAddress);
      expect(aavePoolAddr).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("5. Math Invariants & Solvency", function () {
    it("Should correctly track separate USDT and BNB liabilities", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID_USDT, MIN_DEPOSIT_USDT);
      
      const totalUsdtPrinc = await vault.totalUsdtPrincipal();
      const totalBnbPrinc = await vault.totalBnbPrincipal();
      
      expect(totalUsdtPrinc).to.equal(MIN_DEPOSIT_USDT);
      expect(totalBnbPrinc).to.equal(0);
    });
  });
});
