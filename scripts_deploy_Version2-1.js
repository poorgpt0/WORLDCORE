const { ethers } = require("hardhat");

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
});
