// Retired after the public-mint MockHAHA was created. Do not run this script.
// The product token is the fixed-supply `HAHA` contract deployed from
// DeployHAHAStandaloneMainnet.s.sol. The old MockHAHA remains on-chain but is
// not used by the app or CrowdStaking.
console.error("REFUSED: this script deployed a public-mint MockHAHA. Use the fixed-supply HAHA deployment and never redeploy a public-mint mock on mainnet.");
process.exit(2);
