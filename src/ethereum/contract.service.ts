import { ChainId } from '@infinityxyz/lib/types/core';
import { GOERLI_STAKER_CONTRACT_ADDRESS } from '@infinityxyz/lib/utils';
import { InfinityStakerABI } from '@infinityxyz/lib/abi/infinityStaker';
import { BadRequestException, Injectable } from '@nestjs/common';
import { EthereumService } from './ethereum.service';
import { BigNumber, utils } from 'ethers';

@Injectable()
export class ContractService {
  constructor(private ethereumService: EthereumService) {}

  /**
   * Convert a balance in GWEI to ETH.
   * @param balance
   * @returns
   */
  toEther(balance: BigNumber) {
    const ether = utils.formatEther(balance);
    return +ether;
  }

  getStakerContract(chainId: string | ChainId) {
    // TODO: return correct contract based on specified chain id
    if (chainId != ChainId.Goerli) {
      throw new BadRequestException(`Chain id '${chainId}' is currently not supported!`);
    }

    return this.ethereumService.getContract({
      abi: InfinityStakerABI,
      address: GOERLI_STAKER_CONTRACT_ADDRESS,
      chainId: chainId
    });
  }
}
