import { ChainId } from '@infinityxyz/lib/types/core';
import { ErrorResponseDto } from '@infinityxyz/lib/types/dto';
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ParamUserId } from 'auth/param-user-id.decorator';
import { ApiTag } from 'common/api-tags';
import { ResponseDescription } from 'common/response-description';
import { ParseUserIdPipe } from 'user/parser/parse-user-id.pipe';
import { ParsedUserId } from 'user/parser/parsed-user-id';
import { OrdersService } from 'v2/orders/orders.service';
import { Side, TakerOrdersQuery } from 'v2/orders/query';

@Controller('v2/users')
export class UsersController {
  constructor(protected _ordersService: OrdersService) {}

  @Get(':userId/orders')
  @ApiOperation({
    description: 'Get orders for a user',
    tags: [ApiTag.Orders, ApiTag.User]
  })
  @ApiOkResponse({ description: ResponseDescription.Success }) // TODO add type
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  public async getUserOrders(
    @ParamUserId('userId', ParseUserIdPipe) user: ParsedUserId,
    @Query() query: TakerOrdersQuery
  ) {
    if (query.side === Side.Taker) {
      if (!('status' in query)) {
        throw new BadRequestException('Status is required for taker orders');
      }
    }
    const orders = await this._ordersService.getDisplayOrders(query.chainId ?? ChainId.Mainnet, query, {
      user: user.userAddress
    });
    return orders;
  }
}
