import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserDocument } from '../../../../libs/common/src/models/user.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersSerivce: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersSerivce.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUser(@CurrentUser() user: UserDocument) {
    return user;
  }
}
