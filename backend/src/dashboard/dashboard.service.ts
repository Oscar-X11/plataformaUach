import { courseLabel } from '../courses/courses.service';
import { Injectable } from '@nestjs/common';
import { TokenPayload } from '../auth/token.service';
import { average, decimalToNumber, submissionState } from '../classwork/submission-state';
import { PrismaService } from '../database/prisma.service';

const DAY = 86_400_000;

export interface DashboardItem {
  id: string;
  title: string;
  points: number;
  courseId: string;
  courseName: string;
  dueAt: Date;
  status: 'ASSIGNED' | 'LATE' | 'SUBMITTED' | 'GRADED';
}

export interface DashboardGrade {
  id: string;
  assignmentTitle: string;
  courseId: string;
  courseName: string;
  grade: number;
  points: number;
  gradedAt: Date;
}

/**
 * Resúmenes de la pantalla de inicio. La forma del alumno coincide con
 * frontend/src/lib/dashboard/types.ts (StudentDashboardData) salvo el color
 * del curso, que el frontend asigna a partir del id.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async student(user: TokenPayload) {
    const now = new Date();
    const [courses, unreadPostNotices] = await Promise.all([
      this.prisma.course.findMany({
        where: { enrollments: { some: { studentId: user.sub } } },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          term: true,
          grade: true,
          career: { select: { code: true, faculty: { select: { scheme: true } } } },
          teacher: { select: { fullName: true } },
          assignments: {
            select: {
              id: true,
              title: true,
              dueAt: true,
              points: true,
              submissions: {
                where: { studentId: user.sub },
                select: {
                  status: true,
                  submittedAt: true,
                  returnedAt: true,
                  grade: true,
                  updatedAt: true,
                },
              },
            },
          },
          posts: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, content: true, createdAt: true, author: { select: { fullName: true } } },
          },
        },
      }),
      this.prisma.notification.findMany({
        where: { userId: user.sub, type: 'POST_CREATED', readAt: null },
        select: { link: true, createdAt: true },
      }),
    ]);

    const pending: DashboardItem[] = [];
    const recentlySubmitted: DashboardItem[] = [];
    const recentGrades: DashboardGrade[] = [];
    const allGrades: { grade: number | null; points: number }[] = [];
    let submittedCount = 0;
    let onTimeCount = 0;

    const courseCards = courses.map((course) => {
      const base = { courseId: course.id, courseName: course.name };
      let courseSubmitted = 0;
      let lastActivity: { label: string; at: Date } | null = null;
      const gradesInCourse: { grade: number | null; points: number }[] = [];

      for (const assignment of course.assignments) {
        const submission = assignment.submissions[0];
        const state = submissionState(assignment.dueAt, submission, now);
        const grade = submission?.status === 'RETURNED' ? decimalToNumber(submission.grade) : null;
        const item = { id: assignment.id, title: assignment.title, points: assignment.points, ...base };

        if (state === 'pending' || state === 'missing') {
          if (assignment.dueAt) {
            pending.push({ ...item, dueAt: assignment.dueAt, status: state === 'missing' ? 'LATE' : 'ASSIGNED' });
          }
        } else {
          courseSubmitted++;
          submittedCount++;
          if (state !== 'late') onTimeCount++;
          const dueAt = assignment.dueAt ?? submission?.submittedAt;
          if (dueAt && Math.abs(dueAt.getTime() - now.getTime()) <= 7 * DAY) {
            recentlySubmitted.push({ ...item, dueAt, status: state === 'returned' ? 'GRADED' : 'SUBMITTED' });
          }
        }

        if (submission?.status === 'RETURNED') {
          gradesInCourse.push({ grade, points: assignment.points });
          allGrades.push({ grade, points: assignment.points });
          if (grade !== null && submission.returnedAt) {
            recentGrades.push({
              id: assignment.id,
              assignmentTitle: assignment.title,
              ...base,
              grade,
              points: assignment.points,
              gradedAt: submission.returnedAt,
            });
          }
        }
        if (submission && (!lastActivity || submission.updatedAt > lastActivity.at)) {
          lastActivity = {
            label: submission.status === 'ASSIGNED' ? `Trabajaste en «${assignment.title}»` : `Entregaste «${assignment.title}»`,
            at: submission.updatedAt,
          };
        }
      }

      const next = pending
        .filter((item) => item.courseId === course.id && item.status === 'ASSIGNED')
        .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];

      return {
        id: course.id,
        name: course.name,
        subjectCode: courseLabel(course),
        term: course.term,
        teacherName: course.teacher.fullName,
        submittedCount: courseSubmitted,
        assignmentCount: course.assignments.length,
        average: average(gradesInCourse),
        nextDue: next ? { title: next.title, dueAt: next.dueAt } : null,
        lastActivity,
      };
    });

    // Un aviso está "sin leer" si su notificación sigue sin leer.
    const isUnread = (courseId: string, createdAt: Date) =>
      unreadPostNotices.some(
        (notice) =>
          notice.link === `/cursos/${courseId}` &&
          Math.abs(notice.createdAt.getTime() - createdAt.getTime()) < 60_000,
      );

    const announcements = courses
      .flatMap((course) =>
        course.posts.map((post) => ({
          id: post.id,
          courseId: course.id,
          courseName: course.name,
          authorName: post.author.fullName,
          content: post.content,
          createdAt: post.createdAt,
          unread: isUnread(course.id, post.createdAt),
        })),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8);

    const terms = [...new Set(courses.map((course) => course.term))];

    return {
      term: terms.join(' · '),
      isSample: false,
      courses: courseCards,
      pending: pending.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
      recentlySubmitted,
      announcements,
      recentGrades: recentGrades
        .sort((a, b) => b.gradedAt.getTime() - a.gradedAt.getTime())
        .slice(0, 5),
      stats: { overallAverage: average(allGrades), onTimeCount, submittedCount },
    };
  }

  async teacher(user: TokenPayload) {
    const now = new Date();
    const courses = await this.prisma.course.findMany({
      where: { teacherId: user.sub },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        term: true,
        grade: true,
        career: { select: { code: true, faculty: { select: { scheme: true } } } },
        _count: { select: { enrollments: true } },
        assignments: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            submissions: { select: { status: true } },
          },
        },
      },
    });

    const upcoming = courses
      .flatMap((course) =>
        course.assignments
          .filter((a) => a.dueAt && a.dueAt >= now && a.dueAt.getTime() - now.getTime() <= 14 * DAY)
          .map((a) => ({
            id: a.id,
            title: a.title,
            dueAt: a.dueAt!,
            courseId: course.id,
            courseName: course.name,
            submitted: a.submissions.filter((s) => s.status !== 'ASSIGNED').length,
            students: course._count.enrollments,
          })),
      )
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, 8);

    const toReview = await this.prisma.submission.findMany({
      where: { status: 'SUBMITTED', assignment: { course: { teacherId: user.sub } } },
      orderBy: { submittedAt: 'asc' },
      take: 8,
      select: {
        submittedAt: true,
        status: true,
        student: { select: { id: true, fullName: true } },
        assignment: {
          select: { id: true, title: true, dueAt: true, course: { select: { id: true, name: true } } },
        },
      },
    });

    return {
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        term: course.term,
        subjectCode: courseLabel(course),
        studentCount: course._count.enrollments,
        assignmentCount: course.assignments.length,
        toReview: course.assignments.reduce(
          (sum, a) => sum + a.submissions.filter((s) => s.status === 'SUBMITTED').length,
          0,
        ),
      })),
      upcoming,
      toReview: toReview.map(({ assignment, student, submittedAt, status }) => ({
        assignmentId: assignment.id,
        title: assignment.title,
        courseId: assignment.course.id,
        courseName: assignment.course.name,
        student,
        submittedAt,
        late: submissionState(assignment.dueAt, { status, submittedAt }) === 'late',
      })),
    };
  }

  async admin() {
    const [byRole, inactive, courses, assignments, submissions, recentUsers] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { status: { not: 'ACTIVE' } } }),
      this.prisma.course.count(),
      this.prisma.assignment.count(),
      this.prisma.submission.count({ where: { status: { not: 'ASSIGNED' } } }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, fullName: true, username: true, role: true, createdAt: true },
      }),
    ]);
    const count = (role: string) => byRole.find((row) => row.role === role)?._count._all ?? 0;
    return {
      users: { students: count('STUDENT'), teachers: count('TEACHER'), admins: count('ADMIN'), inactive },
      courses,
      assignments,
      submissions,
      recentUsers,
    };
  }
}
