import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, SubscriptionStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as AppleReceiptVerify from 'node-apple-receipt-verify';
import axios from 'axios';
import { CreateSubscriptionDto, UpdateSubscriptionDto, VerifyReceiptDto, SubscriptionFeaturesDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;
  private readonly logger = new Logger(SubscriptionsService.name);

  // Subscription pricing (in cents for Stripe)
  private readonly PRICING = {
    [SubscriptionTier.GOLD]: {
      monthly: 1499, // $14.99
      yearly: 14900, // $149.00 ($12.42/month)
    },
    [SubscriptionTier.GLOWING]: {
      monthly: 2999, // $29.99
      yearly: 29900, // $299.00 ($24.92/month)
    },
  };

  // Subscription features by tier
  private readonly FEATURES = {
    [SubscriptionTier.FREE]: {
      dailyPops: 10,
      canSeeWhoLiked: false,
      hasBoosts: false,
      hasSuperPops: false,
      hasAdvancedFilters: false,
      hasThemedBalloons: false,
      priorityInSearch: false,
      unlimitedRewinds: false,
    },
    [SubscriptionTier.GOLD]: {
      dailyPops: 30,
      canSeeWhoLiked: true,
      hasBoosts: true,
      hasSuperPops: false,
      hasAdvancedFilters: true,
      hasThemedBalloons: false,
      priorityInSearch: true,
      unlimitedRewinds: true,
    },
    [SubscriptionTier.GLOWING]: {
      dailyPops: 100, // Fair use unlimited
      canSeeWhoLiked: true,
      hasBoosts: true,
      hasSuperPops: true,
      hasAdvancedFilters: true,
      hasThemedBalloons: true,
      priorityInSearch: true,
      unlimitedRewinds: true,
    },
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });

    // Configure Apple Receipt Verify
    AppleReceiptVerify.config({
      secret: this.configService.get('APPLE_SHARED_SECRET'),
      environment: this.configService.get('NODE_ENV') === 'production' ? ['production'] : ['sandbox'],
      excludeOldTransactions: true,
      extended: true,
    });
  }

  // Get subscription features for a tier
  getFeatures(tier: SubscriptionTier): SubscriptionFeaturesDto {
    return this.FEATURES[tier];
  }

  // Create or update a subscription
  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Check for existing subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription && existingSubscription.status === SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('Active subscription already exists');
      }

      // Handle different payment methods
      let subscriptionData: any = {
        userId,
        tier: dto.tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        ...this.FEATURES[dto.tier],
      };

      // Process Stripe payment
      if (dto.stripePaymentMethodId) {
        const stripeSubscription = await this.createStripeSubscription(
          user.email,
          dto.stripePaymentMethodId,
          dto.tier,
        );
        subscriptionData.stripeSubscriptionId = stripeSubscription.id;
        subscriptionData.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      }

      // Process Apple IAP
      if (dto.appleReceiptData) {
        const appleValidation = await this.validateAppleReceipt(dto.appleReceiptData);
        subscriptionData.appleReceiptData = dto.appleReceiptData;
        subscriptionData.currentPeriodEnd = new Date(appleValidation.expirationDate);
      }

      // Process Google Play
      if (dto.googlePurchaseToken) {
        const googleValidation = await this.validateGooglePurchase(dto.googlePurchaseToken);
        subscriptionData.googlePurchaseToken = dto.googlePurchaseToken;
        subscriptionData.currentPeriodEnd = new Date(googleValidation.expiryTimeMillis);
      }

      // Create or update subscription
      const subscription = await this.prisma.subscription.upsert({
        where: { userId },
        create: subscriptionData,
        update: subscriptionData,
      });

      // Update user's subscription tier
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: dto.tier,
          subscriptionEndDate: subscriptionData.currentPeriodEnd,
        },
      });

      // Create payment record
      await this.prisma.payment.create({
        data: {
          userId,
          amount: this.PRICING[dto.tier].monthly / 100,
          currency: 'USD',
          paymentMethod: dto.stripePaymentMethodId
            ? PaymentMethod.STRIPE
            : dto.appleReceiptData
            ? PaymentMethod.APPLE_IAP
            : PaymentMethod.GOOGLE_PLAY,
          status: PaymentStatus.COMPLETED,
          description: `${dto.tier} Subscription`,
        },
      });

      return subscription;
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  // Create Stripe subscription
  private async createStripeSubscription(
    email: string,
    paymentMethodId: string,
    tier: SubscriptionTier,
  ) {
    try {
      // Create or get customer
      const customers = await this.stripe.customers.list({ email, limit: 1 });
      let customer = customers.data[0];

      if (!customer) {
        customer = await this.stripe.customers.create({
          email,
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } else {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });
        await this.stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Balloon'd ${tier} Subscription`,
              },
              unit_amount: this.PRICING[tier].monthly,
              recurring: {
                interval: 'month',
              },
            },
          },
        ],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      this.logger.error('Stripe subscription creation failed', error);
      throw new BadRequestException('Payment processing failed');
    }
  }

  // Validate Apple receipt
  private async validateAppleReceipt(receiptData: string) {
    return new Promise((resolve, reject) => {
      AppleReceiptVerify.validate(
        {
          receipt: receiptData,
        },
        (error, products) => {
          if (error) {
            this.logger.error('Apple receipt validation failed', error);
            reject(new BadRequestException('Invalid Apple receipt'));
          } else {
            const latestReceipt = products[0];
            resolve({
              productId: latestReceipt.productId,
              expirationDate: latestReceipt.expirationDate,
            });
          }
        },
      );
    });
  }

  // Validate Google Play purchase
  private async validateGooglePurchase(purchaseToken: string) {
    try {
      const packageName = this.configService.get('GOOGLE_PACKAGE_NAME');
      const response = await axios.post(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${purchaseToken}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${await this.getGoogleAccessToken()}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Google purchase validation failed', error);
      throw new BadRequestException('Invalid Google purchase');
    }
  }

  // Get Google access token
  private async getGoogleAccessToken(): Promise<string> {
    // Implement Google OAuth2 token retrieval
    // This is a simplified version - implement proper token management
    return 'google_access_token';
  }

  // Cancel subscription
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return { message: 'Subscription will be canceled at the end of the current period' };
  }

  // Get user's subscription
  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!subscription) {
      return {
        tier: SubscriptionTier.FREE,
        features: this.FEATURES[SubscriptionTier.FREE],
      };
    }

    return {
      ...subscription,
      features: this.FEATURES[subscription.tier],
    };
  }

  // Check subscription status and update if expired
  async checkSubscriptionStatus(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return;

    // Check if subscription has expired
    if (subscription.currentPeriodEnd < new Date()) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: SubscriptionTier.FREE,
          subscriptionEndDate: null,
        },
      });
    }
  }

  // Handle Stripe webhook
  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionFromStripe(subscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleSuccessfulPayment(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await this.handleFailedPayment(failedInvoice);
        break;
    }
  }

  // Update subscription from Stripe webhook
  private async updateSubscriptionFromStripe(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    const status = this.mapStripeStatus(stripeSubscription.status);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    // Update user tier if subscription is no longer active
    if (status !== SubscriptionStatus.ACTIVE) {
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: {
          subscriptionTier: SubscriptionTier.FREE,
          subscriptionEndDate: null,
        },
      });
    }
  }

  // Map Stripe status to our status
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.EXPIRED,
    };
    return statusMap[stripeStatus] || SubscriptionStatus.EXPIRED;
  }

  // Handle successful payment
  private async handleSuccessfulPayment(invoice: Stripe.Invoice) {
    await this.prisma.payment.create({
      data: {
        userId: invoice.customer as string,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        paymentMethod: PaymentMethod.STRIPE,
        stripePaymentIntentId: invoice.payment_intent as string,
        status: PaymentStatus.COMPLETED,
        description: 'Subscription payment',
      },
    });
  }

  // Handle failed payment
  private async handleFailedPayment(invoice: Stripe.Invoice) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      });
    }
  }
}
