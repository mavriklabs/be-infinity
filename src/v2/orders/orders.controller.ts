import { ChainOBOrder } from '@infinityxyz/lib/types/core';
import { ErrorResponseDto, OrdersV2Dto } from '@infinityxyz/lib/types/dto';
import { BadRequestException, Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { ApiTag } from 'common/api-tags';
import { InvalidCollectionError } from 'common/errors/invalid-collection.error';
import { InvalidNonceError } from 'common/errors/invalid-nonce.error';
import { InvalidTokenError } from 'common/errors/invalid-token-error';

import { ResponseDescription } from 'common/response-description';
import { ChainOBOrderHelper } from './chain-ob-order-helper';
import { OrdersService } from './orders.service';
import { ProtocolOrdersService } from './protocol-orders/protocol-orders.service';
import { CacheControlInterceptor } from 'common/interceptors/cache-control.interceptor';

@Controller('v2/orders')
export class OrdersController {
  constructor(protected _ordersService: OrdersService, protected _protocolOrdersService: ProtocolOrdersService) {}

  @Get()
  @ApiOperation({
    description: 'Get listings from all marketplaces',
    tags: [ApiTag.Orders]
  })
  @ApiOkResponse({ description: ResponseDescription.Success })
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  @UseInterceptors(new CacheControlInterceptor({ maxAge: 20 }))
  public async getAggregatedListings(
    @Query() query: { collection: string; chainId: string; tokenId?: string; continuation?: string }
  ) {
    try {
      const listings = await this._ordersService.getAggregatedListings(
        query.chainId,
        query.collection,
        query.tokenId,
        query.continuation
      );
      return {
        data: listings?.orders,
        cursor: listings?.continuation,
        hasNextPage: listings?.continuation ? true : false
      };
    } catch (err) {
      if (err instanceof InvalidCollectionError) {
        throw new BadRequestException(err.message);
      } else if (err instanceof InvalidTokenError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Post()
  @ApiOperation({
    description: 'Post raw orders',
    tags: [ApiTag.Orders]
  })
  @ApiOkResponse({ description: ResponseDescription.Success, type: String })
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  public async postChainOBOrder(@Body() body: OrdersV2Dto): Promise<void> {
    try {
      const chainId = body.chainId;

      const orders: ChainOBOrderHelper[] = [];
      for (const item of body.orders) {
        try {
          const order = new ChainOBOrderHelper(chainId, instanceToPlain(item) as ChainOBOrder);
          orders.push(order);
        } catch (err) {
          throw new BadRequestException('Invalid order');
        }
      }

      const result = await this._ordersService.createOrders(chainId, orders);
      return result;
    } catch (err) {
      if (err instanceof InvalidCollectionError) {
        throw new BadRequestException(err.message);
      } else if (err instanceof InvalidTokenError) {
        throw new BadRequestException(err.message);
      } else if (err instanceof InvalidNonceError) {
        throw new BadRequestException(err.message);
      } else if (err instanceof Error) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
