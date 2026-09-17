import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsRepository } from './reservations.repository';
import { PAYMENTS_SERVICE } from '@app/common/constants/services';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, lastValueFrom, map, mergeMap, of } from 'rxjs';
import { CheckoutSessionCreated, UserDto } from '@app/common';
import {
  PaymentFailedDto,
  PaymentSucceededDto,
} from '@app/common/dto/payment-events.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    @Inject(PAYMENTS_SERVICE) private readonly paymentsService: ClientProxy,
  ) {}

  async create(createReservationDto: CreateReservationDto, user: UserDto) {
    if (createReservationDto.charge.card) {
      return this.createWithDirectChange(createReservationDto, user);
    }
    return this.createWithCheckoutSession(createReservationDto, user);
  }

  private async createWithDirectChange(
    { charge, ...createReservationDto }: CreateReservationDto,
    { email, _id: userId }: UserDto,
  ) {
    const paymenIntent = await lastValueFrom(
      this.paymentsService.send<{ id: string }>('create_charge', {
        ...charge,
        email,
      }),
    );

    return await this.reservationsRepository.create({
      ...createReservationDto,
      amount: charge.amount,
      status: 'confirmed',
      invoiceId: paymenIntent.id,
      timestamp: new Date(),
      userId,
    });
  }

  private async createWithCheckoutSession(
    { charge, ...createReservationDto }: CreateReservationDto,
    { email, _id: userId }: UserDto,
  ) {
    const reservation = await this.reservationsRepository.create({
      ...createReservationDto,
      amount: charge.amount,
      timestamp: new Date(),
      userId,
      status: 'pending',
    });

    const session = await lastValueFrom(
      this.paymentsService.send<CheckoutSessionCreated>(
        'create_checkout_session',
        {
          amount: charge.amount,
          email,
          reservationId: reservation._id.toHexString(),
        },
      ),
    );

    const updatedReservation =
      await this.reservationsRepository.findOneAndUpdate(
        {
          _id: reservation._id,
        },
        {
          $set: {
            checkoutSessionId: session.id,
          },
        },
      );

    return { ...updatedReservation, paymentUrl: session.url };
  }

  async handlePaymentSucceeded({
    reservationId,
    paymentIntentId,
  }: PaymentSucceededDto) {
    this.logger.log(`Payment succeeded for reservation ${reservationId}`);

    try {
      await this.reservationsRepository.findOneAndUpdate(
        { _id: reservationId },
        {
          $set: {
            status: 'confirmed',
            invoiceId: paymentIntentId,
          },
        },
      );
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        throw err;
      }

      this.logger.warn(
        `Received payment for unknown reservation ${reservationId}`,
      );
    }
  }

  async handlePaymentFailed({ reservationId, reason }: PaymentFailedDto) {
    this.logger.log(
      `Payment failed for reservation ${reservationId} for reason: ${reason}`,
    );

    try {
      await this.reservationsRepository.findOneAndUpdate(
        { _id: reservationId, status: 'pending' },
        {
          $set: {
            status: 'cancelled',
          },
        },
      );
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        throw err;
      }
    }
  }

  async findAll() {
    return this.reservationsRepository.find({});
  }

  async findOne(_id: string) {
    return this.reservationsRepository.findOne({ _id });
  }

  async update(_id: string, updateReservationDto: UpdateReservationDto) {
    return this.reservationsRepository.findOneAndUpdate(
      { _id },
      { $set: updateReservationDto },
    );
  }

  async remove(_id: string) {
    return this.reservationsRepository.findOneAndDelete({ _id });
  }
}
