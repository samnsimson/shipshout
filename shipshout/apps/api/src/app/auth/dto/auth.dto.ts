import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail() email!: string;
    @MinLength(8) password!: string;
    @IsOptional() @IsString() name?: string;
}

export class EmailDto {
    @IsEmail() email!: string;
}

export class ResetPasswordDto {
    @IsString() token!: string;
    @MinLength(8) password!: string;
}

export class LinkCredentialsDto {
    @MinLength(8) password!: string;
}

export class ChangePasswordDto {
    @IsString() currentPassword!: string;
    @MinLength(8) newPassword!: string;
}
