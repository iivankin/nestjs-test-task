import { ApiProperty } from '@nestjs/swagger';
import { Post } from '../entities/post.entity';

export class ListDto {
  @ApiProperty({ type: () => [Post] })
  data: Post[];

  @ApiProperty({ type: 'integer' })
  total: number;
}
