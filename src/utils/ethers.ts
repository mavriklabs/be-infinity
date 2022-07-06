import { ALCHEMY_JSON_RPC_ETH_MAINNET, ALCHEMY_JSON_RPC_POLYGON_MAINNET } from '../constants';
import { ethers } from 'ethers';
import { ETHEREUM_INFINITY_EXCHANGE_ADDRESS, POLYGON_INFINITY_EXCHANGE_ADDRESS } from '@infinityxyz/lib/utils';

const ethProvider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_JSON_RPC_ETH_MAINNET);
const polygonProvider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_JSON_RPC_POLYGON_MAINNET);
const localHostProvider = new ethers.providers.StaticJsonRpcProvider(process.env.localhostRpc);

export function getProvider(chainId: string) {
  if (chainId === '1') {
    return ethProvider;
  } else if (chainId === '137') {
    return polygonProvider;
  } else if (chainId === '31337') {
    return localHostProvider;
  }
  return null;
}

export function getExchangeAddress(chainId: string) {
  if (chainId === '1') {
    return ETHEREUM_INFINITY_EXCHANGE_ADDRESS;
  } else if (chainId === '137') {
    return POLYGON_INFINITY_EXCHANGE_ADDRESS;
  }
  return null;
}

export function getChainId(chain: string) {
  if (chain.trim().toLowerCase() === 'ethereum') {
    return '1';
  } else if (chain.trim().toLowerCase() === 'polygon') {
    return '137';
  } else if (chain.trim().toLowerCase() === 'localhost') {
    return '31337';
  }
  return '';
}
