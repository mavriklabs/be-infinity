import { BaseCollection, ChainId, OrderDirection } from '@infinityxyz/lib/types/core';
import { Injectable } from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { StakerContractService } from 'ethereum/contracts/staker.contract.service';
import { FirebaseService } from 'firebase/firebase.service';
import { ParsedUserId } from 'user/parser/parsed-user-id';
import FirestoreBatchHandler from 'firebase/firestore-batch-handler';
import { ParsedCollectionId } from 'collections/collection-id.pipe';
import { CollectionFavoriteDto, FavoriteCollectionsQueryDto, UserFavoriteDto } from '@infinityxyz/lib/types/dto';
import { CursorService } from 'pagination/cursor.service';
import { firestoreConstants } from '@infinityxyz/lib/utils';

@Injectable()
export class FavoritesService {
  private fsBatchHandler: FirestoreBatchHandler;

  constructor(
    private firebaseService: FirebaseService,
    private stakerContractService: StakerContractService,
    private cursorService: CursorService
  ) {
    this.fsBatchHandler = new FirestoreBatchHandler(this.firebaseService);
  }

  private getRootRef(chainId = ChainId.Mainnet) {
    const stakerContract = this.stakerContractService.getStakerAddress(chainId);
    const phaseId = this.getCurrentPhaseId();
    return this.firebaseService.firestore
      .collection('favorites')
      .doc(`${chainId}:${stakerContract}`)
      .collection(phaseId)
      .doc('entries');
  }

  private getCurrentPhaseId() {
    return '1'; // TODO: get current active phase from firestore (CC @Joe) // const ref = db.collection(firestoreConstants.REWARDS_COLL).doc(collection.chainId) as FirebaseFirestore.DocumentReference<TokenomicsConfigDto>;
  }

  private fromCollection(collection: BaseCollection): Omit<CollectionFavoriteDto, 'numFavorites' | 'timestamp'> {
    return {
      bannerImage: collection.metadata.bannerImage,
      collectionAddress: collection.address,
      collectionChainId: collection.chainId,
      hasBlueCheck: collection.hasBlueCheck,
      name: collection.metadata.name,
      profileImage: collection.metadata.profileImage,
      slug: collection.slug
    };
  }

  /**
   * Submit a favorite collection for a specific user during this phase.
   * This method may overwrite previous saves.
   *
   * @param collection The collection to vote for.
   * @param user The user who is submitting the vote.
   */
  async saveFavorite(collection: ParsedCollectionId, user: ParsedUserId) {
    const rootRef = this.getRootRef(user.userChainId);
    const usersRef = rootRef
      .collection(`${firestoreConstants.USERS_COLL}`)
      .doc(`${user.userChainId}:${user.userAddress}`);
    const collectionsRef = rootRef
      .collection(`${firestoreConstants.COLLECTIONS_COLL}`)
      .doc(`${collection.chainId}:${collection.address}`);

    // Get the current favorited collection.
    // It is used to update it before writing the new favorite below..
    const oldFavoritedCollection = await this.getFavoriteCollection(user);

    const currentFavoritedCollection = (await collection.ref.get()).data() as BaseCollection;

    const timestamp = Date.now();

    this.fsBatchHandler.add(
      usersRef,
      {
        collectionChainId: collection.chainId,
        collectionAddress: collection.address,
        userAddress: user.userAddress,
        userChainId: user.userChainId,
        timestamp
      } as UserFavoriteDto,
      { merge: false }
    );
    // If we already voted on another collection, decrement the votes on it.
    if (oldFavoritedCollection) {
      const oldCollectionRef = rootRef
        .collection(firestoreConstants.COLLECTIONS_COLL)
        .doc(`${oldFavoritedCollection.collectionChainId}:${oldFavoritedCollection.collectionAddress}`);

      this.fsBatchHandler.add(
        oldCollectionRef,
        {
          numFavorites: firebaseAdmin.firestore.FieldValue.increment(-1) as any,
          timestamp
        } as CollectionFavoriteDto,
        { merge: true }
      );
    }
    // Vote on the specified collection.
    this.fsBatchHandler.add(
      collectionsRef,
      {
        ...this.fromCollection(currentFavoritedCollection),
        numFavorites: firebaseAdmin.firestore.FieldValue.increment(1) as any,
        timestamp
      } as CollectionFavoriteDto,
      { merge: true }
    );

    await this.fsBatchHandler.flush();
  }

  /**
   * Returns the current user-favorited collection.
   * @param user
   * @param chainId
   * @returns
   */
  async getFavoriteCollection(user: ParsedUserId): Promise<null | UserFavoriteDto> {
    const docRef = this.getRootRef(user.userChainId)
      .collection(firestoreConstants.USERS_COLL)
      .doc(`${user.userChainId}:${user.userAddress}`);
    const snap = await docRef.get();
    return snap.exists ? (snap.data() as UserFavoriteDto) : null;
  }

  /**
   * Returns a paginated list of favorited collections during this phase.
   * @param query
   * @returns
   */
  async getFavoriteCollectionsLeaderboard(query: FavoriteCollectionsQueryDto) {
    const rootRef = this.getRootRef();
    type Cursor = { collection: string };
    const queryCursor = this.cursorService.decodeCursorToObject<Cursor>(query.cursor);
    console.log(queryCursor);
    const limit = +query.limit + 1;

    const leaderboardQuery = rootRef
      .collection(firestoreConstants.COLLECTIONS_COLL)
      .orderBy('numFavorites', query.orderDirection ?? OrderDirection.Ascending)
      .startAt(queryCursor.collection ?? 0)
      .limit(limit);

    const leaderboardSnapshot = await leaderboardQuery.get();

    const leaderboard = leaderboardSnapshot.docs.map((doc) => doc.data()) as CollectionFavoriteDto[];
    const hasNextPage = leaderboard.length > query.limit;
    const last = leaderboard[leaderboard.length - 1];
    const updatedCursorObj: Cursor = {
      collection: last ? `${last.collectionChainId}:${last.collectionAddress}` : queryCursor.collection
    };

    const leaderboardResults = leaderboard.slice(0, query.limit);

    return {
      hasNextPage,
      data: leaderboardResults,
      cursor: this.cursorService.encodeCursor(updatedCursorObj)
    };
  }
}