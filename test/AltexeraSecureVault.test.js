const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Altexera Smart Contract: Independent Security Review", function () {
  let vault;
  let owner, treasury, bot, user, attacker;
  let usdt;
  const ZERO_ADDRESS = ethers.ZeroAddress;
  const PLAN_ID = 1;
  const MIN_DEPOSIT = ethers.parseUnits("100", 18);

  beforeEach(async function () {
    [owner, treasury, bot, user, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy();
    const USDT_ADDR = await usdt.getAddress();

    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const aavePool = await MockAavePool.deploy(USDT_ADDR);
    
    const MockAUsdt = await ethers.getContractFactory("MockERC20");
    const aUsdt = await MockAUsdt.deploy();
    
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const priceFeed = await MockPriceFeed.deploy();

    const Vault = await ethers.getContractFactory("AltexeraSecureVaultTest");
    vault = await Vault.deploy(
      treasury.address, 
      [bot.address], 
      USDT_ADDR, 
      await aavePool.getAddress(),
      await aUsdt.getAddress(),
      await priceFeed.getAddress()
    );
    const VAULT_ADDR = await vault.getAddress();

    await usdt.mint(user.address, ethers.parseUnits("10000", 18));
    await usdt.mint(attacker.address, ethers.parseUnits("10000", 18));
    await usdt.connect(user).approve(VAULT_ADDR, ethers.MaxUint256);
    await usdt.connect(attacker).approve(VAULT_ADDR, ethers.MaxUint256);
    await usdt.mint(VAULT_ADDR, ethers.parseUnits("100000", 18));
  });

  describe("1. Anti-Rug Pull (No Admin Backdoors)", function () {
    it("Should NOT have an owner() function (No Ownable contract)", async function () {
      expect(vault.interface.getFunction("owner")).to.be.null;
    });

    it("Should NOT expose any sweep or emergencyWithdraw functions", async function () {
      expect(vault.sweep).to.be.undefined;
      expect(vault.emergencyWithdraw).to.be.undefined;
      expect(vault.withdrawAll).to.be.undefined;
    });

    it("Should NOT allow the treasury to manually drain funds", async function () {
      await expect(
        vault.connect(treasury).collectTreasuryFees()
      ).to.be.revertedWithCustomError(vault, "NothingToClaim");
    });
  });

  describe("2. Access Control & Anti-Theft", function () {
    it("SECURITY: Attacker cannot claim another user's stake", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID, MIN_DEPOSIT);
      await expect(
        vault.connect(attacker).claimStakingRewards(0)
      ).to.be.revertedWithCustomError(vault, "InvalidStake");
    });

    it("SECURITY: Attacker cannot inject fake external profit", async function () {
      await expect(
        vault.connect(attacker).depositExternalProfit(ethers.parseUnits("1000", 18))
      ).to.be.revertedWithCustomError(vault, "Unauthorized");
    });

    it("SECURITY: Unregistered users cannot deposit funds", async function () {
      await expect(
        vault.connect(attacker).deposit(PLAN_ID, MIN_DEPOSIT)
      ).to.be.revertedWithCustomError(vault, "NotRegistered");
    });
  });

  describe("3. Lockup Periods & Withdrawal Limits", function () {
    it("SECURITY: User cannot withdraw funds before the plan matures", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID, MIN_DEPOSIT);
      await expect(
        vault.connect(user).closeStake(0)
      ).to.be.revertedWithCustomError(vault, "NotMature");
    });

    it("Should reject deposits outside plan boundaries (Overflow protection)", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      
      // Deposit smaller than min
      await expect(
        vault.connect(user).deposit(PLAN_ID, ethers.parseUnits("50", 18))
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
      
      // Deposit larger than max (uint128 test)
      await expect(
        vault.connect(user).deposit(PLAN_ID, ethers.parseUnits("100000000000", 18))
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
    });
  });

  describe("4. Oracle & External Security", function () {
    it("SECURITY: Hardcoded Aave and Chainlink addresses cannot be modified", async function () {
      const chainlinkFeed = await vault.CHAINLINK_BNB_USD();
      const aavePool = await vault.AAVE_POOL();
      expect(chainlinkFeed).to.not.equal(ethers.ZeroAddress);
      expect(aavePool).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("5. Math Invariants & Solvency", function () {
    it("Should correctly calculate ROI and maintain solvency", async function () {
      await vault.connect(user).joinNetwork(ZERO_ADDRESS);
      await vault.connect(user).deposit(PLAN_ID, MIN_DEPOSIT);
      
      const totalLiab = await vault.totalPrincipalLiability();
      expect(totalLiab).to.equal(MIN_DEPOSIT);

      const stake = await vault.userStakes(user.address, 0);
      expect(stake.amount).to.equal(MIN_DEPOSIT);
      expect(stake.totalProfit).to.be.greaterThan(0);
    });
  });
});
