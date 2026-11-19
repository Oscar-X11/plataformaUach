import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { CreateGroupDto, ListGroupsQuery } from './groups.dto';

const GROUP_SELECT = {
  id: true,
  title: true,
  description: true,
  capacity: true,
  meetingInfo: true,
  createdAt: true,
  creatorId: true,
  subject: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, fullName: true } },
  _count: { select: { members: true } },
} satisfies Prisma.StudyGroupSelect;

type GroupRow = Prisma.StudyGroupGetPayload<{ select: typeof GROUP_SELECT }>;

/** Grupos de estudio abiertos a toda la comunidad, con cupo. */
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListGroupsQuery, user: TokenPayload) {
    const search = query.search?.trim();
    const groups = await this.prisma.studyGroup.findMany({
      where: {
        subjectId: query.subjectId,
        ...(query.mine ? { members: { some: { userId: user.sub } } } : {}),
        ...(search ? { OR: [{ title: { contains: search } }, { description: { contains: search } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: GROUP_SELECT,
    });
    const memberOf = await this.membershipSet(groups.map((group) => group.id), user.sub);
    return groups.map((group) => this.view(group, user, memberOf.has(group.id)));
  }

  async get(groupId: string, user: TokenPayload) {
    const group = await this.prisma.studyGroup.findUnique({ where: { id: groupId }, select: GROUP_SELECT });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    const members = await this.prisma.studyGroupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'asc' },
      select: { joinedAt: true, user: { select: { id: true, fullName: true, role: true } } },
    });
    const isMember = members.some((member) => member.user.id === user.sub);
    return {
      ...this.view(group, user, isMember),
      // La lista de integrantes solo la ven los integrantes.
      members: isMember || user.role === 'ADMIN' ? members.map(({ user: member, joinedAt }) => ({ ...member, joinedAt })) : [],
    };
  }

  async create(dto: CreateGroupDto, user: TokenPayload) {
    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { id: true } });
      if (!subject) throw new BadRequestException('La materia no existe');
    }
    const group = await this.prisma.studyGroup.create({
      data: {
        title: dto.title,
        description: dto.description,
        capacity: dto.capacity,
        meetingInfo: dto.meetingInfo || null,
        subjectId: dto.subjectId || null,
        creatorId: user.sub,
        members: { create: { userId: user.sub } },
      },
      select: { id: true },
    });
    return this.get(group.id, user);
  }

  /** El cupo se revisa dentro de una transacción para no rebasarlo con dos uniones a la vez. */
  async join(groupId: string, user: TokenPayload) {
    await this.prisma.$transaction(async (tx) => {
      const group = await tx.studyGroup.findUnique({
        where: { id: groupId },
        select: { capacity: true, _count: { select: { members: true } } },
      });
      if (!group) throw new NotFoundException('Grupo no encontrado');
      const already = await tx.studyGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.sub } },
        select: { userId: true },
      });
      if (already) return;
      if (group._count.members >= group.capacity) throw new ConflictException('El grupo ya está lleno');
      await tx.studyGroupMember.create({ data: { groupId, userId: user.sub } });
    });
    return this.get(groupId, user);
  }

  async leave(groupId: string, user: TokenPayload) {
    const group = await this.prisma.studyGroup.findUnique({ where: { id: groupId }, select: { creatorId: true } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.creatorId === user.sub) {
      throw new BadRequestException('Eres quien creó el grupo: bórralo si ya no se reunirán');
    }
    await this.prisma.studyGroupMember.deleteMany({ where: { groupId, userId: user.sub } });
    return this.get(groupId, user);
  }

  async remove(groupId: string, user: TokenPayload) {
    const group = await this.prisma.studyGroup.findUnique({ where: { id: groupId }, select: { creatorId: true } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.creatorId !== user.sub && user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo quien creó el grupo o un administrador pueden borrarlo');
    }
    await this.prisma.studyGroup.delete({ where: { id: groupId } });
  }

  private async membershipSet(groupIds: string[], userId: string) {
    const rows = await this.prisma.studyGroupMember.findMany({
      where: { groupId: { in: groupIds }, userId },
      select: { groupId: true },
    });
    return new Set(rows.map((row) => row.groupId));
  }

  private view(group: GroupRow, user: TokenPayload, isMember: boolean) {
    const { _count, creatorId, ...rest } = group;
    return {
      ...rest,
      memberCount: _count.members,
      isMember,
      isCreator: creatorId === user.sub,
      canDelete: creatorId === user.sub || user.role === 'ADMIN',
    };
  }
}
