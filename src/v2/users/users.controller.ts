import { ApiRole, ChainId } from '@infinityxyz/lib/types/core';
import { ErrorResponseDto, Side, TakerOrdersQuery } from '@infinityxyz/lib/types/dto';
import { BadRequestException, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Auth } from 'auth/api-auth.decorator';
import { SiteRole } from 'auth/auth.constants';
import { ParamUserId } from 'auth/param-user-id.decorator';
import { ApiTag } from 'common/api-tags';
import { ResponseDescription } from 'common/response-description';
import { ParseUserIdPipe } from 'user/parser/parse-user-id.pipe';
import { ParsedUserId } from 'user/parser/parsed-user-id';
import { OrdersService } from 'v2/orders/orders.service';

@Controller('v2/users')
export class UsersController {
  constructor(protected _ordersService: OrdersService) {}

  @Get(':userId/orders')
  @ApiOperation({
    description: 'Get orders for a user',
    tags: [ApiTag.Orders, ApiTag.User]
  })
  @ApiOkResponse({ description: ResponseDescription.Success })
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

  @Get(':userId/beta/auth')
  @ApiOperation({
    description: "Get the user's beta authorization status",
    tags: [ApiTag.User]
  })
  @Auth(SiteRole.User, ApiRole.Guest)
  @ApiOkResponse({ description: ResponseDescription.Success })
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  public async getBetaAuth(@Param('userId') userId: string, @Query('chainId') chainId?: ChainId): Promise<unknown> {
    await Promise.resolve();
    return {};
  }

  @Post(':hashedAddress/beta/auth/callback')
  @ApiOperation({
    description: "Handle the user's auth callback",
    tags: [ApiTag.User]
  })
  @Auth(SiteRole.User, ApiRole.Guest)
  @ApiOkResponse({ description: ResponseDescription.Success })
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  public async handleTwitterAuthCallback(
    @Param('userId') userId: string,
    @Query('chainId') chainId?: ChainId
  ): Promise<unknown> {
    await Promise.resolve();
    return {};
  }

  @Get(':userId/nonce')
  @ApiOperation({
    description: 'Get order nonce for user',
    tags: [ApiTag.Orders]
  })
  @ApiOkResponse({ description: ResponseDescription.Success })
  @ApiBadRequestResponse({ description: ResponseDescription.BadRequest, type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: ResponseDescription.InternalServerError })
  public async getOrderNonce(
    @ParamUserId('userId', ParseUserIdPipe) user: ParsedUserId,
    @Query('chainId') chainId?: ChainId
  ): Promise<number> {
    const nonce = await this._ordersService.getNonce(user.userAddress, chainId ?? ChainId.Mainnet);
    return parseInt(nonce.toString(), 10);
  }
}
