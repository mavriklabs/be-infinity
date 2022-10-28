import { OrderDirection } from '@infinityxyz/lib/types/core';
import { Env } from '@infinityxyz/lib/utils';
import { AUTH_MESSAGE_HEADER, AUTH_NONCE_HEADER, AUTH_SIGNATURE_HEADER } from 'auth/auth.constants';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { devOptionalEnvVariables, EnvironmentVariables } from 'types/environment-variables.interface';
import {} from '@reservoir0x/reservoir-kit-client';

export const env = process.env.INFINITY_NODE_ENV || Env.Prod;
export const envFileName = env === Env.Dev ? '.dev.env' : '.env';

export const getMultipleEnvVariables = (
  prefix: string,
  minLength = 1,
  envVariables: Record<string, string>
): string[] => {
  const variables = [];
  let i = 0;

  for (;;) {
    try {
      const apiKey = envVariables[`${prefix}${i}`];
      if (!apiKey) {
        throw new Error(`Missing environment variable ${name}`);
      }
      variables.push(apiKey);
      i += 1;
    } catch (err) {
      break;
    }
  }

  if (variables.length < minLength) {
    throw new Error(
      `Env Variable: ${prefix} failed to get min number of keys. Found: ${variables.length} Expected: at least ${minLength}`
    );
  }
  return variables;
};

export const loadJsonFile = <T = any>(fileName: string): T => {
  const path = resolve(__dirname, './creds', fileName);
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error(`Failed to load json file from path: ${path}`, err);
    throw err;
  }
};

export const validateAndTransformEnvVariables = (env: Record<string, string>) => {
  const openseaApiKeys = getMultipleEnvVariables('OPENSEA_API_KEY', 1, env);
  const INFINITY_NODE_ENV = (env.INFINITY_NODE_ENV as Env | undefined) ?? Env.Prod;
  const isProd = INFINITY_NODE_ENV === Env.Prod;
  const firebaseServiceAccountName = isProd ? 'nftc-infinity-firebase-creds.json' : 'nftc-dev-firebase-creds.json';
  const firebaseServiceAccount = loadJsonFile<object>(firebaseServiceAccountName);

  const envVariables: EnvironmentVariables = {
    twitterBearerToken: env.twitterBearerToken,
    ALCHEMY_API_KEY: env.ALCHEMY_API_KEY,
    mnemonicApiKey: env.mnemonicApiKey,
    alchemyJsonRpcEthMainnet: env.alchemyJsonRpcEthMainnet,
    alchemyJsonRpcPolygonMainnet: env.alchemyJsonRpcPolygonMainnet,
    alchemyJsonRpcEthGoerli: env.alchemyJsonRpcEthGoerli,
    REDIS_URL: env.REDIS_URL ?? '',
    GEM_API_KEY: env.GEM_API_KEY,
    OPENSEA_API_KEYS: openseaApiKeys,
    RESERVOIR_API_KEY: env.RESERVOIR_API_KEY,
    ZORA_API_KEY: env.ZORA_API_KEY,
    INFINITY_NODE_ENV,
    firebaseServiceAccount
  };

  for (const key of Object.keys(envVariables) as (keyof EnvironmentVariables)[]) {
    const isRequiredInProd = true;
    const isRequiredInDev = !devOptionalEnvVariables.includes(key);
    const isRequired = isProd ? isRequiredInProd : isRequiredInDev;
    if (isRequired && !envVariables[key]) {
      throw new Error(`Environment variable ${key} is not set`);
    }
  }
  return envVariables;
};

export const auth = {
  nonce: AUTH_NONCE_HEADER,
  signature: AUTH_SIGNATURE_HEADER,
  message: AUTH_MESSAGE_HEADER
};

export const API_BASE = 'https://sv.infinity.xyz';
export const SITE_BASE = 'https://infinity.xyz';

export const DEFAULT_MIN_ETH = 0.0000001;
export const DEFAULT_MAX_ETH = 1000000; // For listings
export const DEFAULT_PRICE_SORT_DIRECTION = OrderDirection.Descending;

export const INFINITY_EMAIL = 'hi@infinity.xyz';
export const FB_STORAGE_BUCKET = 'infinity-static';
export const FIREBASE_SERVICE_ACCOUNT = 'nftc-infinity-firebase-creds.json';
export const ORIGIN = 'https://infinity.xyz';
export const INFINITY_URL = 'https://infinity.xyz/';

export const ONE_MIN = 1000 * 60;
export const TEN_MINS = ONE_MIN * 10;
export const ONE_HOUR = 3_600_000; // In ms
export const ONE_DAY = ONE_HOUR * 24;
export const MIN_TWITTER_UPDATE_INTERVAL = ONE_HOUR; // In ms
export const MIN_DISCORD_UPDATE_INTERVAL = ONE_HOUR;
export const MIN_LINK_UPDATE_INTERVAL = ONE_HOUR;
export const MIN_COLLECTION_STATS_UPDATE_INTERVAL = ONE_HOUR / 4; // 15 min

// every 1s, collect stats for 1 collection from the list (see: /update-social-stats)
export const UPDATE_SOCIAL_STATS_INTERVAL = 1000;

export const ALCHEMY_CACHED_IMAGE_HOST = 'cloudinary';
