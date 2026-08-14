import { IsString, MinLength } from 'class-validator';

export class EmailConnectDto {
    @IsString()
    @MinLength(1)
    apiKey!: string;
}
