import Stripe from 'stripe';
import { CardDto } from './card.dto';
import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChargeDto {
  @IsOptional()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
