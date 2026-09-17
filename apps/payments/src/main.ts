import { NestFactory } from '@nestjs/core';
import { PaymentsModule } from './payments.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [configService.getOrThrow('RABBITMQ_URI')],
      queue: 'payments',
    },
  });
  await app.startAllMicroservices();
  await app.listen(configService.get('HTTP_PORT') as number);
}
bootstrap();
