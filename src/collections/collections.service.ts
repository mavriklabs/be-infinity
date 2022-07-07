import { ChainId, Collection, CollectionMetadata, CreationFlow, TopOwner } from '@infinityxyz/lib/types/core';
import { ExternalNftCollectionDto, NftCollectionDto } from '@infinityxyz/lib/types/dto/collections/nfts';
import { firestoreConstants, getCollectionDocId, getEndCode, getSearchFriendlyString } from '@infinityxyz/lib/utils';
import { Injectable } from '@nestjs/common';
import { BackfillService } from 'backfill/backfill.service';
import {
  TopOwnersQueryDto,
  TopOwnerDto,
  CollectionSearchQueryDto,
  PaginatedCollectionsDto,
  CollectionDto
} from '@infinityxyz/lib/types/dto/collections';
import {
  CuratedCollectionsOrderBy,
  CuratedCollectionsQuery
} from '@infinityxyz/lib/types/dto/collections/curation/curated-collections-query.dto';
import { FirebaseService } from 'firebase/firebase.service';
import { MnemonicService } from 'mnemonic/mnemonic.service';
import { CursorService } from 'pagination/cursor.service';
import { ParsedCollectionId } from './collection-id.pipe';

interface CollectionQueryOptions {
  /**
   * Only show collections that have been fully indexed
   *
   * Defaults to `true`.
   */
  limitToCompleteCollections: boolean;
}

@Injectable()
export default class CollectionsService {
  constructor(
    private firebaseService: FirebaseService,
    private mnemonicService: MnemonicService,
    private paginationService: CursorService,
    private backfillService: BackfillService
  ) {}

  private get defaultCollectionQueryOptions(): CollectionQueryOptions {
    return {
      limitToCompleteCollections: false
    };
  }

  async getTopOwners(collection: ParsedCollectionId, query: TopOwnersQueryDto) {
    const collectionData = (await collection.ref.get()).data();
    // if (collectionData?.state?.create?.step !== CreationFlow.Complete) {
    //   throw new InvalidCollectionError(collection.address, collection.chainId, 'Collection is not complete');
    // }

    const offset = this.paginationService.decodeCursorToNumber(query.cursor || '');

    let topOwners: TopOwner[] = [];
    // check if data exists in firestore
    const collectionDocId = getCollectionDocId({ collectionAddress: collection.address, chainId: collection.chainId });
    const allStatsDoc = await this.firebaseService.firestore
      .collection(firestoreConstants.COLLECTIONS_COLL)
      .doc(collectionDocId)
      .collection(firestoreConstants.COLLECTION_STATS_COLL)
      .doc('all')
      .get();
    if (allStatsDoc.exists) {
      topOwners = allStatsDoc.data()?.topOwnersByOwnedNftsCount as TopOwner[];
    }

    // if data doesn't exist in firestore, fetch from mnemonic
    if (!topOwners || topOwners.length === 0) {
      const topOwnersMnemonic = await this.mnemonicService.getTopOwners(collection.address, {
        limit: query.limit,
        orderDirection: query.orderDirection,
        offset
      });
      const owners = topOwnersMnemonic?.owner ?? [];
      for (const owner of owners) {
        topOwners.push({
          owner: owner.address,
          count: owner.ownedCount
        });
      }
    }

    if (!topOwners || topOwners.length === 0) {
      return null;
    }

    const hasNextPage = topOwners.length > query.limit;
    const updatedOffset = topOwners.length + offset;
    const cursor = this.paginationService.encodeCursor(updatedOffset);

    const numNfts = (collectionData as Collection)?.numNfts;

    const transformedData = topOwners.map((owner) => {
      const topOwner: TopOwnerDto = {
        ownerAddress: owner.owner,
        ownedCount: owner.count,
        percentOwned: Math.floor((owner.count / numNfts) * 1_000_000) / 10_000,
        numNfts
      };
      return topOwner;
    });

    return {
      cursor,
      hasNextPage,
      data: transformedData
    };
  }

  async searchByName(search: CollectionSearchQueryDto) {
    let firestoreQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      this.firebaseService.firestore.collection(firestoreConstants.COLLECTIONS_COLL);

    if (search.query) {
      const startsWith = getSearchFriendlyString(search.query);
      const endCode = getEndCode(startsWith);

      if (startsWith && endCode) {
        firestoreQuery = firestoreQuery.where('slug', '>=', startsWith).where('slug', '<', endCode);
      }
    }

    firestoreQuery = firestoreQuery.orderBy('slug');

    const cursor = this.paginationService.decodeCursor(search.cursor);
    if (cursor) {
      firestoreQuery = firestoreQuery.startAfter(cursor);
    }

    const snapshot = await firestoreQuery
      .select(
        'address',
        'chainId',
        'slug',
        'metadata.name',
        'metadata.profileImage',
        'metadata.description',
        'metadata.bannerImage',
        'hasBlueCheck'
      )
      .limit(search.limit + 1) // +1 to check if there are more results
      .get();

    const collections = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        address: data.address as string,
        chainId: data.chainId as string,
        slug: data.slug as string,
        name: data.metadata.name as string,
        hasBlueCheck: data.hasBlueCheck as boolean,
        profileImage: data.metadata.profileImage as string,
        bannerImage: data.metadata.bannerImage as string,
        description: data.metadata.description as string
      };
    });

    const hasNextPage = collections.length > search.limit;
    if (hasNextPage) {
      collections.pop(); // Remove item used to check if there are more results
    }
    const updatedCursor = this.paginationService.encodeCursor(collections?.[collections?.length - 1]?.slug ?? ''); // Must be after we pop the item used for pagination

    return {
      data: collections,
      cursor: updatedCursor,
      hasNextPage
    };
  }

  /**
   * Queries for a collection via address
   */
  async getCollectionByAddress(
    collection: { address: string; chainId: string },
    options?: CollectionQueryOptions
  ): Promise<Collection | undefined> {
    const queryOptions = options ?? this.defaultCollectionQueryOptions;
    const docId = getCollectionDocId({ collectionAddress: collection.address, chainId: collection.chainId });

    const collectionSnapshot = await this.firebaseService.firestore
      .collection(firestoreConstants.COLLECTIONS_COLL)
      .doc(docId)
      .get();

    let result = collectionSnapshot.data();
    if (!result) {
      result = await this.backfillService.backfillCollection(collection.chainId as ChainId, collection.address);
    }
    if (queryOptions.limitToCompleteCollections && result?.state?.create?.step !== CreationFlow.Complete) {
      return undefined;
    }
    return result as Collection;
  }

  async getCollectionsByAddress(collections: { address: string; chainId: ChainId }[]) {
    const docIds = [
      ...new Set(
        collections.map((collection) => {
          try {
            return getCollectionDocId({ collectionAddress: collection.address, chainId: collection.chainId });
          } catch (err) {
            return null;
          }
        })
      )
    ].filter((item) => item !== null) as string[];

    const collectionRefs = docIds.map((docId) =>
      this.firebaseService.firestore.collection(firestoreConstants.COLLECTIONS_COLL).doc(docId)
    );

    const getCollection = (coll: { address: string; chainId: string }) => {
      try {
        const collection =
          collectionMap[getCollectionDocId({ collectionAddress: coll.address, chainId: coll.chainId })] ?? {};
        return collection;
      } catch (err) {
        return {};
      }
    };

    if (collectionRefs.length === 0) {
      return { getCollection };
    }

    const collectionsSnap = await this.firebaseService.firestore.getAll(...collectionRefs);

    const collectionMap: { [id: string]: Partial<Collection> } = {};
    collectionsSnap.forEach((item, index) => {
      const docId = docIds[index];
      collectionMap[docId] = (item.data() ?? {}) as Partial<Collection>;
    });

    return { getCollection };
  }

  async setCollectionMetadata(collection: ParsedCollectionId, metadata: CollectionMetadata) {
    await collection.ref.set({ metadata }, { merge: true });
  }

  /**
   * Verify whether the given user address is the deployer/creator of the collection.
   */
  async isDeployer(userAddress: string, { ref }: ParsedCollectionId) {
    const document = await ref.get();
    const data = document.data();
    return userAddress === data?.deployer;
  }

  /**
   * Verify whether the given user address is an editor of the collection.
   */
  async isEditor(userAddress: string, { ref }: ParsedCollectionId) {
    const editorsDocRef = ref.collection(firestoreConstants.AUTH_COLL).doc(firestoreConstants.EDITORS_DOC);
    const document = await editorsDocRef.get();
    const data = document.data();

    return data?.[userAddress]?.authorized == true;
  }

  /**
   * Verify whether the given user address is an administrator of the infnity platform.
   */
  async isAdmin(userAddress: string) {
    const adminDocRef = this.firebaseService.firestore
      .collection(firestoreConstants.AUTH_COLL)
      .doc(firestoreConstants.ADMINS_DOC);
    const document = await adminDocRef.get();
    const data = document.data();
    return data?.[userAddress]?.authorized == true;
  }

  /**
   * Verify whether the given user address can modify the collection.
   */
  async canModify(userAddress: string, parsedCollection: ParsedCollectionId) {
    return (
      (await this.isDeployer(userAddress, parsedCollection)) ||
      (await this.isEditor(userAddress, parsedCollection)) ||
      (await this.isAdmin(userAddress))
    );
  }

  isSupported(collections: NftCollectionDto[]) {
    // const { getCollection } = await this.getCollectionsByAddress(
    //   collections.map((collection) => ({ address: collection.collectionAddress ?? '', chainId: collection.chainId }))
    // );

    const externalCollection: ExternalNftCollectionDto[] = collections.map((item) => {
      // const collection = getCollection({ address: item.collectionAddress ?? '', chainId: item.chainId });
      // const isSupported = collection?.state?.create?.step === CreationFlow.Complete;
      const isSupported = true;
      const externalCollection: ExternalNftCollectionDto = {
        ...item,
        isSupported
      };
      return externalCollection;
    });

    return externalCollection;
  }

  /**
   * Fetch all curated collections.
   */
  async getCurated(query: CuratedCollectionsQuery): Promise<PaginatedCollectionsDto> {
    const collectionsRef = this.firebaseService.firestore.collection(firestoreConstants.COLLECTIONS_COLL);

    type Cursor = Record<'address' | 'chainId', string | number>;

    const mapOrderByQuery = {
      [CuratedCollectionsOrderBy.Votes]: 'numCuratorVotes',
      [CuratedCollectionsOrderBy.AprHighToLow]: 'numCuratorVotes', // TODO: APRs
      [CuratedCollectionsOrderBy.AprLowToHigh]: 'numCuratorVotes'
    };

    let q = collectionsRef.orderBy(mapOrderByQuery[query.orderBy], query.orderDirection).limit(query.limit + 1);

    if (query.cursor) {
      const decodedCursor = this.paginationService.decodeCursorToObject<Cursor>(query.cursor);
      const lastDocument = await collectionsRef.doc(`${decodedCursor.chainId}:${decodedCursor.address}`).get();
      q = q.startAfter(lastDocument);
    }

    const snap = await q.get();
    const collections = snap.docs.map((item) => item.data() as Collection);

    const hasNextPage = collections.length > query.limit;
    if (hasNextPage) {
      collections.pop();
    }

    const lastItem = collections[collections.length - 1];

    return {
      data: collections as CollectionDto[],
      cursor: hasNextPage
        ? this.paginationService.encodeCursor({ address: lastItem.address, chainId: lastItem.chainId } as Cursor)
        : undefined,
      hasNextPage
    };
  }
}
