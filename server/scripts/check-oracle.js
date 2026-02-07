require('dotenv').config();
const { ethers } = require('ethers');

const FACTORY = '0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B';
const ABI = [
  'function allowedOracles(address) view returns (bool)',
  'function allowedArbitrators(address) view returns (bool)',
  'function owner() view returns (address)',
  'function allowOracle(address)',
  'function allowArbitrator(address)',
];
const rpcUrl = (process.env.SEPOLIA_RPC_URL || '').trim();
const provider = new ethers.JsonRpcProvider(rpcUrl, 11155111);
const factory = new ethers.Contract(FACTORY, ABI, provider);

let pk = (process.env.ORACLE_PRIVATE_KEY || '').trim();
if (pk.indexOf('0x') !== 0) pk = '0x' + pk;
const oracleAddr = new ethers.Wallet(pk).address;

(async () => {
  console.log('Oracle address:', oracleAddr);
  const isOracle = await factory.allowedOracles(oracleAddr);
  console.log('Is whitelisted oracle?', isOracle);
  const isArbitrator = await factory.allowedArbitrators(oracleAddr);
  console.log('Is whitelisted arbitrator?', isArbitrator);
  const owner = await factory.owner();
  console.log('Factory owner:', owner);
})().catch(e => console.error('Error:', e.message));
