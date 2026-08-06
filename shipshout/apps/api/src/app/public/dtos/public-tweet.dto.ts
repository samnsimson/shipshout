import { IsString, MaxLength, MinLength } from 'class-validator';

export class PublicTweetDto {
    @IsString()
    @MinLength(1)
    @MaxLength(4000)
    releaseNotes!: string;
}
