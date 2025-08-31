import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;

  @IsOptional()
  @IsString()
  appleReceiptData?: string;

  @IsOptional()
  @IsString()
  googlePurchaseToken?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}

export class VerifyReceiptDto {
  @IsString()
  platform: 'apple' | 'google';

  @IsString()
  receiptData: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class CreatePaymentIntentDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class WebhookDto {
  @IsString()
  type: string;

  @IsString()
  data: any;
}

export class SubscriptionFeaturesDto {
  dailyPops: number;
  canSeeWhoLiked: boolean;
  hasBoosts: boolean;
  hasSuperPops: boolean;
  hasAdvancedFilters: boolean;
  hasThemedBalloons: boolean;
  priorityInSearch: boolean;
  unlimitedRewinds: boolean;
}
