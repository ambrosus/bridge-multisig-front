import { ethers } from 'ethers';

import ABI from './abi.json';

import { ambChainId, ethChainId } from './providers';

export const ambContractAddress = '0xc5D92aDefb6A3f10ef1DB7c2eA6632350013c688';
export const ethContractAddress = '0xe186C54Dc7804530e239d0d32118b3faf6b99a03';

const createAmbBridgeContract = (provider) =>
  new ethers.Contract(ambContractAddress, ABI, provider);

const createEthBridgeContract = (provider) =>
  new ethers.Contract(ethContractAddress, ABI, provider);

const createBridgeContract = {
  [ambChainId]: createAmbBridgeContract,
  [ethChainId]: createEthBridgeContract,
};

export default createBridgeContract;
