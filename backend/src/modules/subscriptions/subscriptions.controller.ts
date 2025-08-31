import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, VerifyReceiptDto, CreatePaymentIntentDto } from './dto/subscription.dto';
import Stripe from 'stripe';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(@Request() req) {
    return this.subscriptionsService.getUserSubscription(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('features/:tier')
  async getFeatures(@Request() req) {
    return this.subscriptionsService.getFeatures(req.params.tier);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(@Request() req, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cancel')
  async cancelSubscription(@Request() req) {
    return this.subscriptionsService.cancelSubscription(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-receipt')
  async verifyReceipt(@Request() req, @Body() dto: VerifyReceiptDto) {
    return this.subscriptionsService.createSubscription(req.user.id, {
      tier: dto.platform === 'apple' ? 'GOLD' : 'GLOWING',
      appleReceiptData: dto.platform === 'apple' ? dto.receiptData : undefined,
      googlePurchaseToken: dto.platform === 'google' ? dto.receiptData : undefined,
    } as CreateSubscriptionDto);
  }

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!signature || !endpointSecret) {
      throw new BadRequestException('Missing stripe signature or webhook secret');
    }

    let event: Stripe.Event;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err) {
      throw new BadRequestException('Invalid stripe webhook signature');
    }

    await this.subscriptionsService.handleStripeWebhook(event);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-status')
  async checkStatus(@Request() req) {
    await this.subscriptionsService.checkSubscriptionStatus(req.user.id);
    return { checked: true };
  }
}
