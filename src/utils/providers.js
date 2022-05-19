import { ethers } from 'ethers';

const {
  REACT_APP_ETH_CHAIN_ID,
  REACT_APP_AMB_CHAIN_ID,
  REACT_APP_AMB_RPC_URL,
  REACT_APP_INFURA_KEY,
} = process.env;

export const ethChainId = +REACT_APP_ETH_CHAIN_ID;

const ethProvider = new ethers.providers.InfuraProvider(
  ethChainId,
  REACT_APP_INFURA_KEY,
);

export const ambChainId = +REACT_APP_AMB_CHAIN_ID;

export const ambProvider = new ethers.providers.JsonRpcProvider(
  REACT_APP_AMB_RPC_URL,
);

const providers = {
  [ethChainId]: ethProvider,
  [ambChainId]: ambProvider,
};

export default providers;
