import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateChargeDto } from '../../../libs/common/src/dto/create-charge.dto';
import {
  NOTIFICATIONS_SERVICE,
  RESERVATIONS_SERVICE,
} from '@app/common/constants/services';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentsCreateChargeDto } from './dto/payments-create-charge.dto';
import { CheckoutSessionCreated, CreateCheckoutSessionDto } from '@app/common';
import {
  PAYMENT_FAILED_EVENT,
  PAYMENT_SUCCEEDED_EVENT,
} from '@app/common/dto/payment-events.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: ClientProxy,
    @Inject(RESERVATIONS_SERVICE)
    private readonly reservationsService: ClientProxy,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY') as string);
  }

  async createCharge({ card, amount, email }: PaymentsCreateChargeDto) {
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: card?.token,
      },
    });

    const paymentIntent = await this.stripe.paymentIntents.create({
      payment_method: paymentMethod.id,
      amount: amount * 100,
      currency: 'usd',
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    this.notificationsService.emit('notify_email', { email });

    return paymentIntent;
  }

  async createCheckoutSession({
    amount,
    email,
    reservationId,
  }: CreateCheckoutSessionDto): Promise<CheckoutSessionCreated> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: 'Sleepr Reservation',
            },
          },
        },
      ],
      success_url: this.configService.getOrThrow('STRIPE_SUCCESS_URL'),
      cancel_url: this.configService.getOrThrow('STRIPE_CANCEL_URL'),
      metadata: { reservationId },
      customer_email: email,
      client_reference_id: reservationId,
    });

    return { id: session.id, url: session.url };
  }

  handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        this.handlePaymentSucceeded(event.data.object);
        break;
      }
      case 'checkout.session.expired': {
        this.handlePaymentFailed(event.data.object, event.type);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private handlePaymentSucceeded(session: Stripe.Checkout.Session) {
    const reservationId = session.metadata?.reservationId;
    if (!reservationId) {
      this.logger.warn(
        `Checkout session ${session.id} completed without a reservationId`,
      );
      return;
    }

    this.reservationsService.emit(PAYMENT_SUCCEEDED_EVENT, {
      reservationId,
      paymentIntentId: session.payment_intent,
    });

    const email = session.customer_details?.email ?? session.customer_email;
    if (email) {
      this.notificationsService.emit('notify_email', {
        email,
        text: `Your payment of ${(session.amount_total ?? 0) / 100} has completed successfully`,
      });
    }
  }

  private handlePaymentFailed(
    session: Stripe.Checkout.Session,
    reason: string,
  ) {
    const reservationId = session.metadata?.reservationId;
    if (!reservationId) {
      return;
    }

    this.reservationsService.emit(PAYMENT_FAILED_EVENT, {
      reservationId,
      reason,
    });
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.get('STRIPE_WEBHOOK_SECRET') as string,
    );
  }
}
