import { ApiProperty } from '@nestjs/swagger';

export class GithubRepoDto {
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

    @ApiProperty({ example: false, description: 'Whether this repo is already linked to the account' })
    linked!: boolean;

    @ApiProperty({
        example: false,
        description: 'Whether another ShipShout account has already linked this repository',
    })
    claimedByOtherAccount!: boolean;
}

export class GithubRepoListResponseDto {
    @ApiProperty({ type: [GithubRepoDto] })
    repositories!: GithubRepoDto[];
}
