import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: 'string' })
  title: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: 'string' })
  description: string;
}
