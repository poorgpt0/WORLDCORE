const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying WorldcoreBEP20 with:", deployer.address);

  const marketingWallet = process.env.MARKETING_WALLET || deployer.address;
  const liquidityWallet = process.env.LIQUIDITY_WALLET || deployer.address;

  const WorldcoreBEP20 = await ethers.getContractFactory("WorldcoreBEP20");
  const token = await WorldcoreBEP20.deploy(marketingWallet, liquidityWallet);

  await token.waitForDeployment();

  const deployedAddress = await token.getAddress();
  const totalSupply = await token.totalSupply();

  console.log("WorldcoreBEP20 deployed to:", deployedAddress);
  console.log("Total supply:", ethers.formatUnits(totalSupply, 18), "WCORE");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
