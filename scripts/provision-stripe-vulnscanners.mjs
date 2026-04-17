#!/usr/bin/env node
import Stripe from "stripe";
import fs from "fs";
import path from "path";

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const env = {};
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))$/);
      if (m) {
        env[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
      }
    }
    return env;
  } catch (err) {
    return {};
  }
}

const envFile = path.resolve(process.cwd(), ".env.production");
const fileEnv = loadEnvFile(envFile);

const secretKey = process.env.STRIPE_SECRET_KEY || fileEnv.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY not found in env or .env.production");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2022-11-15" });

const products = [
  {
    key: "ESSENTIAL",
    name: "Vulnscanners Essential Credits",
    unit_amount: 1000, // $10
    credits: { nmap: "1", nuclei: "1", zap: "1" },
  },
  {
    key: "PRO",
    name: "Vulnscanners Pro Credits",
    unit_amount: 5000, // $50
    credits: { nmap: "5", nuclei: "5", zap: "5" },
  },
  {
    key: "SCALE",
    name: "Vulnscanners Scale Credits",
    unit_amount: 20000, // $200
    credits: { nmap: "20", nuclei: "20", zap: "20" },
  },
];

async function run() {
  console.log("Creating products and prices in Stripe...");

  const created = {};

  for (const p of products) {
    try {
      const prod = await stripe.products.create({
        name: p.name,
        description: `Credit pack: ${p.name}`,
      });

      const price = await stripe.prices.create({
        unit_amount: p.unit_amount,
        currency: "usd",
        product: prod.id,
        nickname: p.name,
        metadata: p.credits,
      });

      console.log(`Created ${p.key}: product=${prod.id} price=${price.id}`);
      created[p.key] = { product: prod.id, price: price.id };
    } catch (err) {
      console.error(`Failed to create ${p.key}:`, err.message || err);
    }
  }

  console.log("Done. Summary:");
  for (const k of Object.keys(created)) {
    console.log(`${k}_PRODUCT=${created[k].product}`);
    console.log(`${k}_PRICE=${created[k].price}`);
  }

  // Print guidance to update .env.production (we won't modify files automatically here)
  console.log("\nTo persist these price IDs, update your .env.production with:");
  for (const k of Object.keys(created)) {
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_${k}=${created[k].price}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
