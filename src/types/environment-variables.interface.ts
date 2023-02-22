import { Env } from '@infinityxyz/lib/utils';

export interface EnvironmentVariables {
  API_BASE: string;
  twitterBearerToken: string;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  ALCHEMY_API_KEY: string;
  mnemonicApiKey: string;
  alchemyJsonRpcEthMainnet: string;
  alchemyJsonRpcPolygonMainnet: string;
  alchemyJsonRpcEthGoerli: string;
  GEM_API_KEY: string;
  OPENSEA_API_KEYS: string[];
  RESERVOIR_API_KEY: string;
  ZORA_API_KEY: string;
  INFINITY_NODE_ENV: Env;
  firebaseServiceAccount: object;
  REDIS_URL?: string;
  PG_HOST: string;
  PG_PORT: string;
  PG_USER: string;
  PG_PASS: string;
  PG_DB_NAME: string;
  snapshotBucket: string;
}

export const devOptionalEnvVariables: (keyof EnvironmentVariables)[] = ['REDIS_URL'];
