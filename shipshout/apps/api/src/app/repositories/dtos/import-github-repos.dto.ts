import { ArrayMinSize, IsArray, IsInt, IsPositive } from 'class-validator';

export class ImportGithubReposDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @IsPositive({ each: true })
    repoIds!: number[];
}
