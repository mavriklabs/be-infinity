import {
  ReservoirCollectionsV5,
  ReservoirCollsSortBy,
  ReservoirDetailedTokensResponse,
  ReservoirTopCollectionOwnersResponse
} from '@infinityxyz/lib/types/services/reservoir';
import { sleep } from '@infinityxyz/lib/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import got, { Got, Response } from 'got/dist/source';
import { EnvironmentVariables } from 'types/environment-variables.interface';
import { gotErrorHandler } from '../utils/got';

@Injectable()
export class ReservoirService {
  private readonly client: Got;
  constructor(private configService: ConfigService<EnvironmentVariables, true>) {
    const apiKey = this.configService.get('RESERVOIR_API_KEY');
    this.client = got.extend({
      prefixUrl: 'https://api.reservoir.tools/',
      hooks: {
        beforeRequest: [
          (options) => {
            if (!options?.headers?.['x-api-key']) {
              if (!options.headers) {
                options.headers = {};
              }
              options.headers['x-api-key'] = apiKey;
            }
          }
        ]
      },
      /**
       * requires us to check status code
       */
      throwHttpErrors: false,
      cache: false,
      timeout: 20_000
    });
  }

  public async reindexCollection(chainId: string, collectionAddress: string) {
    try {
      await this.errorHandler(() => {
        const body = {
          collection: collectionAddress
        };
        return this.client.post(`collections/refresh/v1`, { json: body, responseType: 'json' });
      });
    } catch (e) {
      console.error('Failed to enqueue collection for reindexing on reservoir', chainId, collectionAddress, e);
    }
  }

  public async getTopCollsByVolume(
    chainId: string,
    sortBy: ReservoirCollsSortBy,
    limit?: number,
    continuation?: string
  ): Promise<ReservoirCollectionsV5 | undefined> {
    try {
      const res: Response<ReservoirCollectionsV5> = await this.errorHandler(() => {
        const searchParams: any = {
          includeTopBid: true,
          sortBy,
          limit: limit ?? 20
        };
        if (continuation) {
          searchParams.continuation = continuation;
        }
        return this.client.get(`collections/v5`, {
          searchParams,
          responseType: 'json'
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return res.body;
    } catch (e) {
      console.error('failed to get top colls from reservoir', chainId, e);
    }
  }

  public async getSingleCollectionInfo(
    chainId: string,
    collectionAddress: string
  ): Promise<ReservoirCollectionsV5 | undefined> {
    try {
      const res: Response<ReservoirCollectionsV5> = await this.errorHandler(() => {
        const searchParams: any = {
          id: collectionAddress
        };
        return this.client.get(`collections/v5`, {
          searchParams,
          responseType: 'json'
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return res.body;
    } catch (e) {
      console.error('failed to get single contract info from reservoir', chainId, collectionAddress, e);
    }
  }

  public async getDetailedTokensInfo(
    chainId: string,
    collectionAddress: string,
    continuation: string,
    limit: number
  ): Promise<ReservoirDetailedTokensResponse | undefined> {
    try {
      const res: Response<ReservoirDetailedTokensResponse> = await this.errorHandler(() => {
        const searchParams: any = {
          contract: collectionAddress,
          limit
        };
        if (continuation) {
          searchParams.continuation = continuation;
        }
        return this.client.get(`tokens/details/v4`, {
          searchParams,
          responseType: 'json'
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return res.body;
    } catch (e) {
      console.error('failed to get detailed tokens info from reservoir', chainId, collectionAddress, e);
    }
  }

  public async getCollectionTopOwners(chainId: string, collectionAddress: string, offset: number, limit: number) {
    try {
      const res: Response<ReservoirTopCollectionOwnersResponse> = await this.errorHandler(() => {
        const searchParams: any = {
          contract: collectionAddress,
          offset,
          limit
        };
        return this.client.get(`owners/v1`, {
          searchParams,
          responseType: 'json'
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return res.body;
    } catch (e) {
      console.error('failed to get detailed tokens info from reservoir', chainId, collectionAddress, e);
    }
  }

  private async errorHandler<T>(request: () => Promise<Response<T>>, maxAttempts = 3): Promise<Response<T>> {
    let attempt = 0;

    for (;;) {
      attempt += 1;

      try {
        const res: Response<T> = await request();

        switch (res.statusCode) {
          case 200:
            return res;

          case 400:
            throw new Error(res.statusMessage);

          case 404:
            throw new Error('Not found');

          case 429:
            await sleep(2000);
            throw new Error('Rate limited');

          case 500:
            throw new Error('Internal server error');

          case 504:
            await sleep(5000);
            throw new Error('OpenSea down');

          default:
            await sleep(2000);
            throw new Error(`Unknown status code: ${res.statusCode}`);
        }
      } catch (err) {
        const handlerRes = gotErrorHandler(err);
        if ('retry' in handlerRes) {
          await sleep(handlerRes.delay);
        } else if (!handlerRes.fatal) {
          // unknown error
          if (attempt >= maxAttempts) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }
  }
}
