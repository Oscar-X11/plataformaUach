import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { CreateGroupDto, ListGroupsQuery } from './groups.dto';
import { GroupsService } from './groups.service';

const Id = () => Param('id', ParseUUIDPipe);

@Controller('study-groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@Query() query: ListGroupsQuery, @Req() { user }: AuthenticatedRequest) {
    return this.groups.list(query, user);
  }

  @Post()
  create(@Body() dto: CreateGroupDto, @Req() { user }: AuthenticatedRequest) {
    return this.groups.create(dto, user);
  }

  @Get(':id')
  get(@Id() id: string, @Req() { user }: AuthenticatedRequest) {
    return this.groups.get(id, user);
  }

  @HttpCode(200)
  @Post(':id/join')
  join(@Id() id: string, @Req() { user }: AuthenticatedRequest) {
    return this.groups.join(id, user);
  }

  @HttpCode(200)
  @Post(':id/leave')
  leave(@Id() id: string, @Req() { user }: AuthenticatedRequest) {
    return this.groups.leave(id, user);
  }

  @HttpCode(204)
  @Delete(':id')
  async remove(@Id() id: string, @Req() { user }: AuthenticatedRequest) {
    await this.groups.remove(id, user);
  }
}
