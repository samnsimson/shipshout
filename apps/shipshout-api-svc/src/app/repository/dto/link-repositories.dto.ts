import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class LinkRepositoriesDto {
    @ApiProperty({
        example: [1296269],
        description: 'GitHub repository IDs to link',
        type: [Number],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    githubIds!: number[];
}
