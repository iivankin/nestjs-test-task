import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column()
  @ApiProperty()
  title: string;

  @Column({ type: 'text' })
  @ApiProperty()
  description: string;

  @ManyToOne(() => User, (user) => user.posts, { eager: true })
  @ApiProperty({ type: () => User })
  author: User;

  @CreateDateColumn()
  @ApiProperty({ type: 'string', format: 'date-time' })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: 'string', format: 'date-time' })
  updated_at: Date;
}
