import { IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterRepoDto {
    @IsEnum(['github', 'linear', 'jira'])
    provider!: 'github' | 'linear' | 'jira';

    @IsString()
    @MinLength(1)
    externalId!: string;

    @IsString()
    @MinLength(1)
    name!: string;
}
