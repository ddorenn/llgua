#!/usr/bin/env node
// Generates a scrypt hash for LINGUA_AUTH_PASSWORD_HASH and a random LINGUA_SESSION_SECRET.
// Usage: npm run auth:hash -- "your-password"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usage: npm run auth:hash -- "a-password-of-at-least-10-characters"');
  process.exit(1);
}
const N = 16384, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r, p });
const value = ["scrypt", N, r, p, salt.toString("base64"), hash.toString("base64")].join("$");
console.log("# Add to .env.local (single quotes keep the $ characters literal):");
console.log(`LINGUA_AUTH_PASSWORD_HASH='${value}'`);
console.log(`LINGUA_SESSION_SECRET='${randomBytes(32).toString("base64url")}'`);
