import { Module, Post } from '@nestjs/common';
import { UsersController } from './users.controller';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { DatabaseModule } from '@app/common';
import { UserDocument, UserSchema } from './models/user.schema';
import { UsersRepository } from './users.repository';
import { LoggerModule } from '@app/common/logger';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
