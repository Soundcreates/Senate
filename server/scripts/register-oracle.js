/**
 * Register the oracle wallet as an allowed oracle + arbitrator
 * in the ProductivityEscrowFactory contract on Sepolia.
 *
 * Only the Factory owner can call allowOracle / allowArbitrator.
 * The oracle wallet IS the Factory owner, so this works.
 */
require('dotenv').config();
const { ethers } = require('ethers');

const FACTORY = '0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B';
const ABI = [
  'function allowedOracles(address) view returns (bool)',
  'function allowedArbitrators(address) view returns (bool)',
  'function allowOracle(address)',
  'function allowArbitrator(address)',
];

const rpcUrl = (process.env.SEPOLIA_RPC_URL || '').trim();
const provider = new ethers.JsonRpcProvider(rpcUrl, 11155111);

let pk = (process.env.ORACLE_PRIVATE_KEY || '').trim();
if (pk.indexOf('0x') !== 0) pk = '0x' + pk;
const wallet = new ethers.Wallet(pk, provider);
const factory = new ethers.Contract(FACTORY, ABI, wallet);

(async () => {
  const addr = wallet.address;
  console.log('Wallet:', addr);

  // Check current status
  const alreadyOracle = await factory.allowedOracles(addr);
  const alreadyArbitrator = await factory.allowedArbitrators(addr);

  if (alreadyOracle) {
    console.log('Already whitelisted as oracle.');
  } else {
    console.log('Registering as oracle...');
    const tx1 = await factory.allowOracle(addr);
    console.log('  tx:', tx1.hash);
    await tx1.wait();
    console.log('  Confirmed. Oracle whitelisted.');
  }

  if (alreadyArbitrator) {
    console.log('Already whitelisted as arbitrator.');
  } else {
    console.log('Registering as arbitrator...');
    const tx2 = await factory.allowArbitrator(addr);
    console.log('  tx:', tx2.hash);
    await tx2.wait();
    console.log('  Confirmed. Arbitrator whitelisted.');
  }

  // Verify
  const isOracle = await factory.allowedOracles(addr);
  const isArbitrator = await factory.allowedArbitrators(addr);
  console.log('\nFinal status:');
  console.log('  allowedOracles:', isOracle);
  console.log('  allowedArbitrators:', isArbitrator);
})().catch(e => {
  console.error('Error:', e.message);
  if (e.data) console.error('Data:', e.data);
});
