import { Module } from '@nestjs/common';
import { OutworkService } from './outwork.service';
import { OutworkController } from './outwork.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OutworkController],
  providers: [OutworkService],
  exports: [OutworkService],
})
export class OutworkModule {}
