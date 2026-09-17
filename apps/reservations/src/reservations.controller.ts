import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser, JwtAuthGuard, Roles } from '@app/common';
import type { UserDto } from '@app/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  PAYMENT_FAILED_EVENT,
  PAYMENT_SUCCEEDED_EVENT,
  PaymentFailedDto,
  PaymentSucceededDto,
} from '@app/common/dto/payment-events.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: UserDto,
  ) {
    return this.reservationsService.create(createReservationDto, user);
  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }

  @EventPattern(PAYMENT_SUCCEEDED_EVENT)
  @UsePipes(new ValidationPipe())
  async handlePaymentSucceeded(@Payload() payload: PaymentSucceededDto) {
    return this.reservationsService.handlePaymentSucceeded(payload);
  }

  @EventPattern(PAYMENT_FAILED_EVENT)
  @UsePipes(new ValidationPipe())
  async handlePaymentFailed(@Payload() payload: PaymentFailedDto) {
    return this.reservationsService.handlePaymentFailed(payload);
  }
}
