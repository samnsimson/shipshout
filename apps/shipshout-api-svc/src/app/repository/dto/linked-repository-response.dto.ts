import { ApiProperty } from '@nestjs/swagger';

export class LinkedRepositoryResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id!: string;

    @ApiProperty({ example: 1296269 })
    githubId!: number;

    @ApiProperty({ example: 'octocat/Hello-World' })
    fullName!: string;

    @ApiProperty({ example: 'Hello-World' })
    name!: string;

    @ApiProperty({ example: 'octocat' })
    owner!: string;

    @ApiProperty({ example: 'main' })
    defaultBranch!: string;

    @ApiProperty({ example: false })
    private!: boolean;

    @ApiProperty({ example: 'https://github.com/octocat/Hello-World' })
    htmlUrl!: string;

    @ApiProperty({ example: '2026-08-11T12:00:00.000Z' })
    linkedAt!: string;
}

export class LinkedRepositoryListResponseDto {
    @ApiProperty({ type: [LinkedRepositoryResponseDto] })
    repositories!: LinkedRepositoryResponseDto[];
}

export class LinkRepositoriesResponseDto {
    @ApiProperty({ type: [LinkedRepositoryResponseDto] })
    linked!: LinkedRepositoryResponseDto[];
}
