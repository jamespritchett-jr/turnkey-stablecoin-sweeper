export const ERC20_ABI = [
  { "type": "function", "name": "balanceOf", "stateMutability":"view",
    "inputs":[{"name":"owner","type":"address"}], "outputs":[{"type":"uint256"}] },
  { "type": "function", "name": "transfer", "stateMutability":"nonpayable",
    "inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}], "outputs":[{"type":"bool"}] }
];
