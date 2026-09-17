import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';
import { GetUserDto } from './dto/get-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private async validateUserDto(
    createUserDto: CreateUserDto,
  ): Promise<boolean> {
    console.log(createUserDto);

    return await this.usersRepository.checkIfUserNotExists({
      email: createUserDto.email,
    });
  }

  async create(createUserDto: CreateUserDto) {
    const isUniqueUser = await this.validateUserDto(createUserDto);

    if (!isUniqueUser) {
      throw new BadRequestException(
        'User with provided email is already exists',
      );
    }

    return this.usersRepository.create({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, 10),
    });
  }

  async verifyUser(email: string, password: string) {
    const user = await this.usersRepository.findOne({ email });
    const passportIsValid = await bcrypt.compare(password, user.password);

    if (!passportIsValid) {
      throw new UnauthorizedException('Credentials are not valid');
    }

    return user;
  }

  async getUser(getUserDto: GetUserDto) {
    return this.usersRepository.findOne(getUserDto);
  }
}
