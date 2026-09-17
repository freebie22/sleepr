import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      event = this.paymentsService.constructEvent(
        request.rawBody as Buffer<ArrayBufferLike>,
        signature,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.paymentsService.handleEvent(event);
    return { received: true };
  }
}
