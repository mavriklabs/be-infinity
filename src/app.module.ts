import { StorageModule } from './storage/storage.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerMiddleware } from 'logger.middleware';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { StatsModule } from './stats/stats.module';
import { join } from 'path';
import { TwitterModule } from './twitter/twitter.module';
import { DiscordModule } from './discord/discord.module';
import { UserModule } from './user/user.module';
import { CollectionsModule } from 'collections/collections.module';
import { OrdersModule } from 'orders/orders.module';
import { AuthModule } from 'auth/auth.module';
import { MnemonicModule } from 'mnemonic/mnemonic.module';

import * as serviceAccount from './creds/nftc-infinity-firebase-creds.json';
import { FB_STORAGE_BUCKET } from './constants';
import { AlchemyModule } from './alchemy/alchemy.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { BackfillModule } from 'backfill/backfill.module';
import { ZoraModule } from 'zora/zora.module';
import { OpenseaModule } from 'opensea/opensea.module';
import { ReservoirModule } from 'reservoir/reservoir.module';
import { GemModule } from 'gem/gem.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: join(__dirname, '../.env'),
      isGlobal: true
    }),
    FirebaseModule.forRoot({
      cert: serviceAccount,
      storageBucket: FB_STORAGE_BUCKET
    }),
    CollectionsModule,
    TwitterModule,
    DiscordModule,
    StatsModule,
    UserModule,
    StorageModule,
    OrdersModule,
    MnemonicModule,
    AuthModule,
    AlchemyModule,
    EthereumModule,
    BackfillModule,
    ZoraModule,
    OpenseaModule,
    ReservoirModule,
    GemModule
  ],
  controllers: [AppController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
