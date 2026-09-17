import { AbstractDocument } from '@app/common/database/abstract.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

@Schema({ versionKey: false })
export class ReservationDocument extends AbstractDocument {
  @Prop()
  timestamp: Date;
  @Prop()
  startDate: Date;
  @Prop()
  endDate: Date;
  @Prop()
  userId: string;
  @Prop()
  invoiceId?: string;
  @Prop()
  amount: number;
  @Prop()
  checkoutSessionId?: string;
  @Prop({ default: 'pending' })
  status: ReservationStatus;
}

export const ReservationSchema =
  SchemaFactory.createForClass(ReservationDocument);
