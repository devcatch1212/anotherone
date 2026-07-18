import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { OutworkService } from './outwork.service';
import { CreateOutworkDto } from './dto/outwork.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/outwork')
@UseGuards(JwtAuthGuard)
export class OutworkController {
  constructor(private readonly outworkService: OutworkService) {}

  @Post()
  async create(
    @Request() req: any,
    @Query('employmentId') employmentId: string,
    @Body() body: CreateOutworkDto,
  ) {
    return this.outworkService.create(req.user.id, employmentId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query('employmentId') employmentId: string) {
    return this.outworkService.findAll(req.user.id, employmentId);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.outworkService.remove(req.user.id, id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    return this.outworkService.approve(id);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.outworkService.reject(id);
  }
}
