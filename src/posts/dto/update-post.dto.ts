import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: 'string', required: false })
  title?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: 'string', required: false })
  description?: string;
}
