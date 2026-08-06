import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDraftDto {
    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    editedCopy!: string;
}
