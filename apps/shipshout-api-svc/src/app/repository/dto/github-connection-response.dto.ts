import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GithubConnectionResponseDto {
    @ApiProperty({ example: true })
    connected!: boolean;

    @ApiPropertyOptional({ example: 'octocat' })
    githubUsername?: string;

    @ApiPropertyOptional({ example: 'read:user,repo,read:org' })
    scopes?: string | null;
}
