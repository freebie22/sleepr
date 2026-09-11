import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { Request } from 'express';
import { TokenPayload } from '../interfaces/token-payload';

declare global {
  namespace Express {
    interface Request {
      Authentication: string | undefined;
    }
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configSerivce: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request.cookies?.Authentication || request?.Authentication,
      ]),
      secretOrKey: configSerivce.get('JWT_SECRET') as string,
    });
  }

  async validate({ userId }: TokenPayload) {
    return this.usersService.getUser({ _id: userId });
  }
}
