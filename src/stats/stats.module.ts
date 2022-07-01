import { Module } from '@nestjs/common';
import { DiscordModule } from 'discord/discord.module';
import { PaginationModule } from 'pagination/pagination.module';
import { TwitterModule } from 'twitter/twitter.module';
import { VotesModule } from 'votes/votes.module';
import { MnemonicModule } from 'mnemonic/mnemonic.module';
import { StatsService } from './stats.service';
import { ZoraModule } from 'zora/zora.module';
import { ReservoirModule } from 'reservoir/reservoir.module';

@Module({
  imports: [TwitterModule, DiscordModule, VotesModule, MnemonicModule, PaginationModule, ZoraModule, ReservoirModule],
  providers: [StatsService],
  exports: [StatsService]
})
export class StatsModule {}
