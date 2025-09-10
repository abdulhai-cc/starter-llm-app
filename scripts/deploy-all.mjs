import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const p = path.join(__dirname, "constructor-args.json");
  if (!fs.existsSync(p)) {
    return { order: [], args: {}, values: {} };
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function toWeiValue(eth) {
  if (!eth) return undefined;
  return hre.ethers.parseEther(eth);
}

async function deployOne(name, ctorArgs = [], ethValue) {
  console.log(`\n=== Deploying ${name} ===`);
  const Factory = await hre.ethers.getContractFactory(name);

  // Basic sanity check: skip if abstract (no bytecode)
  if (!Factory.bytecode || Factory.bytecode === "0x") {
    console.log(
      `Skipping ${name}: appears abstract or interface (no bytecode).`
    );
    return null;
  }

  const opts = ethValue ? { value: toWeiValue(ethValue) } : {};
  const instance = await Factory.deploy(...ctorArgs, opts);
  await instance.waitForDeployment();

  const addr = await instance.getAddress();
  console.log(`${name} deployed at: ${addr}`);
  return { name, address: addr, args: ctorArgs, value: ethValue || null };
}

async function main() {
  const cfg = loadConfig();
  const results = [];
  const order =
    Array.isArray(cfg.order) && cfg.order.length
      ? cfg.order
      : await inferContractsFromArtifacts();

  for (const name of order) {
    const ctorArgs = (cfg.args && cfg.args[name]) || [];
    const val = (cfg.values && cfg.values[name]) || null;
    const res = await deployOne(name, ctorArgs, val);
    if (res) results.push(res);
  }

  // Save a deployments log (for your UI integration or verification)
  const outPath = path.join(__dirname, "../deployments.base-sepolia.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        timestamp: new Date().toISOString(),
        deployments: results,
      },
      null,
      2
    )
  );
  console.log(`\nSaved deployments → ${outPath}`);
}

// Infer contract names from artifacts if no explicit order provided
async function inferContractsFromArtifacts() {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  if (!fs.existsSync(artifactsDir)) {
    throw new Error("No artifacts found. Run `npm run compile` first.");
  }
  const names = [];
  // Artifacts layout: artifacts/contracts/<File>.sol/<Contract>.json
  for (const file of fs.readdirSync(artifactsDir)) {
    const fileDir = path.join(artifactsDir, file);
    if (!fs.statSync(fileDir).isDirectory()) continue;
    for (const item of fs.readdirSync(fileDir)) {
      if (!item.endsWith(".json")) continue;
      const artifact = JSON.parse(
        fs.readFileSync(path.join(fileDir, item), "utf8")
      );
      // Skip interfaces/abstract: no bytecode / empty bytecode
      if (!artifact.bytecode || artifact.bytecode === "0x") continue;
      names.push(artifact.contractName);
    }
  }
  // De-duplicate & sort for deterministic behavior
  return Array.from(new Set(names)).sort();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
