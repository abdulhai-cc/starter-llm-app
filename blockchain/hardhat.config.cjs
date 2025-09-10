// Use CJS to avoid ESM config issues (HH19).
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");

const { PRIVATE_KEY, SEPOLIA_RPC_URL, BASESCAN_API_KEY } = process.env;

// Base Sepolia (chainId 84532)
const baseSepolia = {
  url: SEPOLIA_RPC_URL || "https://sepolia.base.org",
  chainId: 84532,
  accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    baseSepolia,
  },
  etherscan: {
    // Basescan uses the Etherscan API format
    apiKey: {
      baseSepolia: BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
