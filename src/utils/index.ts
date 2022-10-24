import { trimLowerCase } from '@infinityxyz/lib/utils';
import BigNumber from 'bignumber.js';
import { createHash, randomInt } from 'crypto';
import { List, uniqBy } from 'lodash';
import { customAlphabet } from 'nanoid';

export const base64Encode = (data: string) => Buffer.from(data).toString('base64');

export const base64Decode = (data?: string) => Buffer.from(data ?? '', 'base64').toString();

export function deepCopy(object: any) {
  return JSON.parse(JSON.stringify(object));
}

export function bn(num: BigNumber.Value) {
  // @ts-expect-error not sure
  const bigNum = BigNumber(num);
  // Console.log(num + '   ====== bigNUm ' + bigNum);
  // Console.log(__line);
  return bigNum;
}

export function toFixed5(num: BigNumber.Value) {
  // eslint-disable-next-line no-undef
  // Console.log(__line);
  return +bn(num).toFixed(5);
  // Return +num.toString().match(/^-?\d+(?:\.\d{0,5})?/)[0];
}

export function getUniqueItemsByProperties<T>(items: List<T> | null | undefined, property: string) {
  return uniqBy(items, property);
}

export function getWeekNumber(d: Date) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
  // Return array of year and week number
  return [d.getUTCFullYear(), weekNo];
}

export function getNextWeek(weekNumber: number, year: number) {
  const nextWeek = (weekNumber + 1) % 53;
  return nextWeek === 0 ? [year + 1, nextWeek + 1] : [year, nextWeek];
}

const round = (value: number, decimals: number) => {
  const decimalsFactor = Math.pow(10, decimals);
  return Math.floor(value * decimalsFactor) / decimalsFactor;
};

export const calcPercentChange = (prev: number | null = NaN, current: number) => {
  if (prev == null) {
    prev = NaN;
  }
  const change = current - prev;
  const decimal = change / Math.abs(prev);
  const percent = decimal * 100;

  if (Number.isNaN(percent) || !Number.isFinite(percent)) {
    return 0;
  }

  return round(percent, 4);
};

export function getDocIdHash({
  collectionAddress,
  tokenId,
  chainId
}: {
  collectionAddress: string;
  tokenId: string;
  chainId: string;
}) {
  const data = chainId.trim() + '::' + trimLowerCase(collectionAddress) + '::' + tokenId.trim();
  return createHash('sha256').update(data).digest('hex').trim().toLowerCase();
}

export function randomItem<T>(array: T[]): T {
  const index = randomInt(0, array.length - 1);
  return array[index];
}

/**
 * if generating 10,000 IDs per second this requires
 * ~1 billion years, in order to have a 1% probability
 * of at least one collision
 */
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 24);
export const generateUUID = nanoid;

export function partitionArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function safelyWrapPromise<T>(promise: Promise<T>): Promise<T | null> {
  try {
    const result = await promise;
    return result;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export const cl = (data: unknown) => {
  console.log(JSON.stringify(data, null, 2));
};
