import { IsEmail, IsOptional, IsString } from 'class-validator';

export class NotifyEmailDto {
  @IsEmail()
  email: string;
  @IsOptional()
  @IsString()
  text: string;
}
