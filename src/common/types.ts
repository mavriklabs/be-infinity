export type CollectionPeriodStatsContent = {
  chainId?: string;
  contractAddress?: string;
  slug?: string;
  name?: string;
  image?: string;
  avgPrice?: number;
  minPrice?: number;
  floorPrice?: number;
  floorPriceChange?: number;
  maxPrice?: number;
  marketCap?: number;
  salesVolume?: number;
  salesVolumeChange?: number;
  ownerCount?: number;
  tokenCount?: number;
  numSales?: number;
  updatedAt?: number;
  period?: string;
  hasBlueCheck?: boolean;
};
