import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '../dto';

const getCurrentUserByContext = (context: ExecutionContext): UserDto => {
  return context.switchToHttp().getRequest().user;
};

export const CurrentUser = createParamDecorator(
  (_data: never, context: ExecutionContext) => getCurrentUserByContext(context),
);
