import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuizKind } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { TokenPayload } from '../auth/token.service';
import { AvailabilityService } from '../courses/availability.service';
import { csvCell } from '../classwork/grades.service';
import { decimalToNumber } from '../classwork/submission-state';
import { CourseAccessService, CourseRole } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuizDto, UpdateQuizDto } from './quiz.dto';
import {
  answerText,
  AnswerValue,
  attemptDeadline,
  gradeAnswer,
  normalizeAnswer,
  normalizeQuestions,
  quizWindow,
  resultsVisible,
  SUBMIT_GRACE_MS,
} from './quiz-rules';

const QUESTION_SELECT = {
  id: true,
  position: true,
  type: true,
  prompt: true,
  points: true,
  required: true,
  options: true,
  answerKey: true,
} satisfies Prisma.QuizQuestionSelect;

const QUIZ_SELECT = {
  id: true,
  courseId: true,
  title: true,
  description: true,
  kind: true,
  opensAt: true,
  closesAt: true,
  timeLimitMinutes: true,
  resultsVisibility: true,
  requiresKind: true,
  requiresId: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT },
} satisfies Prisma.QuizSelect;

type QuizRow = Prisma.QuizGetPayload<{ select: typeof QUIZ_SELECT }>;
type QuestionRow = Prisma.QuizQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;

const ATTEMPT_SELECT = {
  id: true,
  quizId: true,
  studentId: true,
  startedAt: true,
  deadlineAt: true,
  submittedAt: true,
  score: true,
  maxScore: true,
  needsReview: true,
  answers: { select: { id: true, questionId: true, value: true, points: true } },
} satisfies Prisma.QuizAttemptSelect;

type AttemptRow = Prisma.QuizAttemptGetPayload<{ select: typeof ATTEMPT_SELECT }>;

const totalPoints = (questions: { points: number }[]) => questions.reduce((sum, q) => sum + q.points, 0);

const parseDate = (value: string | null | undefined, label: string) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`La fecha de ${label} no es válida`);
  return date;
};

/**
 * Cuestionarios calificados y encuestas por curso (estilo Google Forms).
 * Un solo intento por alumno. Las calificaciones viven aparte del libro de
 * calificaciones de las tareas.
 */
@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly notifications: NotificationsService,
    private readonly availability: AvailabilityService,
    private readonly activity: ActivityService,
  ) {}

  // ───────────── Lista ─────────────

  async list(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const manager = role !== 'student';
    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId, ...(manager ? {} : { published: true }) },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        kind: true,
        published: true,
        opensAt: true,
        closesAt: true,
        timeLimitMinutes: true,
        resultsVisibility: true,
        requiresKind: true,
        requiresId: true,
        createdAt: true,
        questions: { select: { points: true } },
        _count: { select: { attempts: { where: { submittedAt: { not: null } } } } },
        attempts: manager
          ? { where: { needsReview: true, submittedAt: { not: null } }, select: { id: true } }
          : { where: { studentId: user.sub }, select: ATTEMPT_SELECT },
      },
    });

    const now = new Date();
    const evaluate = manager ? null : await this.availability.evaluator(courseId, user.sub);
    const items = [];
    for (const quiz of quizzes) {
      const base = {
        id: quiz.id,
        title: quiz.title,
        kind: quiz.kind,
        published: quiz.published,
        opensAt: quiz.opensAt,
        closesAt: quiz.closesAt,
        timeLimitMinutes: quiz.timeLimitMinutes,
        window: quizWindow(quiz, now),
        questionCount: quiz.questions.length,
        totalPoints: totalPoints(quiz.questions),
        createdAt: quiz.createdAt,
      };
      if (manager) {
        items.push({ ...base, responses: quiz._count.attempts, needsReview: quiz.attempts.length });
        continue;
      }
      const own = quiz.attempts[0] as AttemptRow | undefined;
      const attempt = own ? await this.finalizeIfExpired(own, now) : null;
      const visible = resultsVisible(quiz, Boolean(attempt?.submittedAt), now);
      const availability = evaluate!({ requiresKind: quiz.requiresKind, requiresId: quiz.requiresId });
      items.push({
        ...base,
        // Requisito pendiente: se muestra bloqueado con la razón (la fecha ya la cubre «window»).
        lockedReason: !attempt && !availability.available ? availability.reason : null,
        myStatus: !attempt ? 'not_started' : attempt.submittedAt ? 'submitted' : 'in_progress',
        myScore: visible ? decimalToNumber(attempt?.score) : null,
        myNeedsReview: visible ? Boolean(attempt?.needsReview) : false,
      });
    }
    return items;
  }

  // ───────────── Crear, editar, publicar, borrar ─────────────

  async create(courseId: string, dto: CreateQuizDto, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const settings = this.settingsFrom(dto, dto.kind, { opensAt: null, closesAt: null });
    const questions = normalizeQuestions(dto.kind, dto.questions ?? []);
    const requirement = await this.availability.validateRequirement(
      courseId,
      { kind: 'quiz' },
      dto.requiresKind,
      dto.requiresId,
    );
    const quiz = await this.prisma.quiz.create({
      data: {
        courseId,
        kind: dto.kind,
        title: dto.title,
        ...settings,
        ...requirement,
        ...(dto.kind === 'SURVEY' ? { resultsVisibility: 'NEVER' as const } : {}),
        questions: { create: questions.map((q, position) => this.questionData(q, position)) },
      },
      select: { id: true },
    });
    return this.get(quiz.id, user);
  }

  async update(quizId: string, dto: UpdateQuizDto, user: TokenPayload) {
    const quiz = await this.loadForManager(quizId, user);
    const settings = this.settingsFrom(dto, quiz.kind, quiz);
    const data: Prisma.QuizUpdateInput = { ...settings };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.requiresKind !== undefined || dto.requiresId !== undefined) {
      Object.assign(
        data,
        await this.availability.validateRequirement(quiz.courseId, { kind: 'quiz', id: quizId }, dto.requiresKind, dto.requiresId),
      );
    }

    if (dto.questions !== undefined) {
      const responses = await this.prisma.quizAttempt.count({ where: { quizId } });
      if (responses > 0) {
        throw new ConflictException('Ya hay respuestas: las preguntas no se pueden cambiar');
      }
      const questions = normalizeQuestions(quiz.kind, dto.questions);
      if (quiz.published && questions.length === 0) {
        throw new BadRequestException('Un formulario publicado necesita al menos una pregunta');
      }
      data.questions = {
        deleteMany: {},
        create: questions.map((q, position) => this.questionData(q, position)),
      };
    }

    await this.prisma.quiz.update({ where: { id: quizId }, data });
    return this.get(quizId, user);
  }

  async setPublished(quizId: string, published: boolean, user: TokenPayload) {
    const quiz = await this.loadForManager(quizId, user);
    if (published && quiz.questions.length === 0) {
      throw new BadRequestException('Agrega al menos una pregunta antes de publicar');
    }
    if (!published) {
      const responses = await this.prisma.quizAttempt.count({ where: { quizId } });
      if (responses > 0) {
        throw new ConflictException('Ya hay respuestas: ciérralo con una fecha de cierre en lugar de ocultarlo');
      }
    }
    const firstTime = published && !quiz.publishedAt;
    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { published, ...(firstTime ? { publishedAt: new Date() } : {}) },
    });

    if (firstTime) {
      this.activity.log({
        userId: user.sub,
        courseId: quiz.courseId,
        action: 'QUIZ_PUBLISHED',
        summary: `Publicó ${quiz.kind === 'SURVEY' ? 'la encuesta' : 'el cuestionario'} «${quiz.title}»`,
      });
      const course = await this.prisma.course.findUniqueOrThrow({
        where: { id: quiz.courseId },
        select: { name: true, enrollments: { select: { studentId: true } } },
      });
      const label = quiz.kind === 'SURVEY' ? 'Nueva encuesta' : 'Nuevo cuestionario';
      await this.notifications.notify(
        course.enrollments.map((enrollment) => enrollment.studentId),
        {
          type: 'QUIZ_PUBLISHED',
          title: `${label} en ${course.name}: ${quiz.title}`,
          link: `/cursos/${quiz.courseId}/cuestionarios/${quiz.id}`,
        },
      );
    }
    return this.get(quizId, user);
  }

  async remove(quizId: string, user: TokenPayload) {
    await this.loadForManager(quizId, user);
    await this.prisma.quiz.delete({ where: { id: quizId } });
  }

  // ───────────── Ver ─────────────

  /** Docente: todo (con respuestas correctas). Alumno: lo que le corresponde según su intento. */
  async get(quizId: string, user: TokenPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: QUIZ_SELECT });
    if (!quiz) throw new NotFoundException('Cuestionario no encontrado');
    const role = await this.access.roleIn(quiz.courseId, user);
    if (role !== 'student') return this.managerView(quiz, role);
    if (!quiz.published) throw new NotFoundException('Cuestionario no encontrado');

    const row = await this.prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: user.sub } },
      select: ATTEMPT_SELECT,
    });
    const attempt = row ? await this.finalizeIfExpired(row) : null;
    const evaluate = await this.availability.evaluator(quiz.courseId, user.sub);
    const availability = evaluate({ requiresKind: quiz.requiresKind, requiresId: quiz.requiresId });
    return { ...this.studentView(quiz, attempt), lockedReason: !attempt && !availability.available ? availability.reason : null };
  }

  private async managerView(quiz: QuizRow, role: CourseRole) {
    const [responses, needsReview, students] = await Promise.all([
      this.prisma.quizAttempt.count({ where: { quizId: quiz.id } }),
      this.prisma.quizAttempt.count({ where: { quizId: quiz.id, needsReview: true, submittedAt: { not: null } } }),
      this.prisma.enrollment.count({ where: { courseId: quiz.courseId } }),
    ]);
    return {
      ...this.publicFields(quiz),
      published: quiz.published,
      myRole: role,
      // Una vez que alguien empezó, las preguntas quedan fijas.
      locked: responses > 0,
      responses,
      needsReview,
      students,
      questions: quiz.questions.map((q) => ({ ...this.questionFields(q), answerKey: q.answerKey })),
    };
  }

  private studentView(quiz: QuizRow, attempt: AttemptRow | null) {
    const now = new Date();
    const submitted = Boolean(attempt?.submittedAt);
    const visible = resultsVisible(quiz, submitted, now);
    const inProgress = Boolean(attempt && !submitted);
    const answers = new Map((attempt?.answers ?? []).map((answer) => [answer.questionId, answer]));

    return {
      ...this.publicFields(quiz),
      myRole: 'student' as const,
      resultsVisible: visible,
      attempt: attempt
        ? {
            status: submitted ? 'submitted' : 'in_progress',
            startedAt: attempt.startedAt,
            deadlineAt: attempt.deadlineAt,
            submittedAt: attempt.submittedAt,
            score: visible ? decimalToNumber(attempt.score) : null,
            maxScore: attempt.maxScore,
            needsReview: visible ? attempt.needsReview : false,
          }
        : null,
      // Las preguntas solo se entregan al responder o al ver resultados.
      questions:
        inProgress || visible
          ? quiz.questions.map((q) => {
              const answer = answers.get(q.id);
              return {
                ...this.questionFields(q),
                answer: answer?.value ?? null,
                ...(visible
                  ? { answerKey: q.answerKey, earned: answer ? decimalToNumber(answer.points) : 0 }
                  : {}),
              };
            })
          : [],
    };
  }

  // ───────────── Responder (alumno) ─────────────

  async start(quizId: string, user: TokenPayload) {
    const quiz = await this.loadForStudent(quizId, user);
    const existing = await this.prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: user.sub } },
      select: { id: true },
    });
    if (!existing) {
      if (quizWindow(quiz) !== 'open') throw new BadRequestException('Este formulario no está abierto');
      await this.availability.assertAvailable(quiz.courseId, user.sub, {
        requiresKind: quiz.requiresKind,
        requiresId: quiz.requiresId,
      });
      if (quiz.questions.length === 0) throw new BadRequestException('Este formulario no tiene preguntas');
      const startedAt = new Date();
      await this.prisma.quizAttempt
        .create({
          data: {
            quizId,
            studentId: user.sub,
            startedAt,
            deadlineAt: attemptDeadline(quiz, startedAt),
            maxScore: totalPoints(quiz.questions),
          },
        })
        // Doble clic: el segundo choca con la llave única y se reutiliza el primero.
        .catch((error: unknown) => {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
        });
    }
    return this.get(quizId, user);
  }

  /** Guardado automático mientras responde. */
  async saveAnswers(quizId: string, answers: unknown[], user: TokenPayload) {
    const { quiz, attempt } = await this.openAttempt(quizId, user);
    await this.storeAnswers(quiz, attempt, answers);
    return { savedAt: new Date() };
  }

  async submit(quizId: string, answers: unknown[], user: TokenPayload) {
    const { quiz, attempt } = await this.openAttempt(quizId, user);
    await this.storeAnswers(quiz, attempt, answers);
    const fresh = await this.prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      select: ATTEMPT_SELECT,
    });

    const missing = quiz.questions.filter(
      (q) => q.required && !fresh.answers.some((answer) => answer.questionId === q.id),
    );
    // Si se acabó el tiempo se envía con lo contestado, aunque falten obligatorias.
    const expired = Boolean(fresh.deadlineAt && Date.now() > fresh.deadlineAt.getTime());
    if (missing.length && !expired) {
      const numbers = missing.map((q) => q.position + 1).join(', ');
      throw new BadRequestException(`Faltan preguntas obligatorias: ${numbers}`);
    }

    await this.finalize(quiz, fresh, new Date());
    this.activity.log({
      userId: user.sub,
      courseId: quiz.courseId,
      action: 'QUIZ_SUBMITTED',
      summary: `Respondió ${quiz.kind === 'SURVEY' ? 'la encuesta' : 'el cuestionario'} «${quiz.title}»`,
    });
    return this.get(quizId, user);
  }

  private async openAttempt(quizId: string, user: TokenPayload) {
    const quiz = await this.loadForStudent(quizId, user);
    const row = await this.prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: user.sub } },
      select: ATTEMPT_SELECT,
    });
    if (!row) throw new BadRequestException('Primero empieza el formulario');
    const attempt = await this.finalizeIfExpired(row);
    if (attempt.submittedAt) throw new ConflictException('Ya enviaste tus respuestas');
    return { quiz, attempt };
  }

  private async storeAnswers(quiz: QuizRow, attempt: AttemptRow, raw: unknown[]) {
    const questions = new Map(quiz.questions.map((q) => [q.id, q]));
    const upserts: Prisma.PrismaPromise<unknown>[] = [];
    const cleared: string[] = [];

    for (const item of raw) {
      if (typeof item !== 'object' || item === null) throw new BadRequestException('Respuesta inválida');
      const { questionId, value } = item as { questionId?: unknown; value?: unknown };
      const question = typeof questionId === 'string' ? questions.get(questionId) : undefined;
      if (!question) throw new BadRequestException('La respuesta no corresponde a una pregunta del formulario');
      const normalized = normalizeAnswer(question, value);
      if (!normalized) {
        cleared.push(question.id);
        continue;
      }
      const json = normalized as unknown as Prisma.InputJsonValue;
      upserts.push(
        this.prisma.quizAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
          create: { attemptId: attempt.id, questionId: question.id, value: json },
          update: { value: json },
        }),
      );
    }
    if (cleared.length) {
      upserts.push(
        this.prisma.quizAnswer.deleteMany({ where: { attemptId: attempt.id, questionId: { in: cleared } } }),
      );
    }
    if (upserts.length) await this.prisma.$transaction(upserts);
  }

  /** Si el tiempo terminó sin enviar, se envía con lo guardado. */
  private async finalizeIfExpired(attempt: AttemptRow, now = new Date()): Promise<AttemptRow> {
    if (attempt.submittedAt || !attempt.deadlineAt) return attempt;
    if (now.getTime() <= attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS) return attempt;
    const quiz = await this.prisma.quiz.findUniqueOrThrow({ where: { id: attempt.quizId }, select: QUIZ_SELECT });
    return this.finalize(quiz, attempt, attempt.deadlineAt);
  }

  /** Califica lo automático, marca lo que revisa el docente y cierra el intento. */
  private async finalize(quiz: QuizRow, attempt: AttemptRow, submittedAt: Date) {
    const questions = new Map(quiz.questions.map((q) => [q.id, q]));
    const graded = attempt.answers.map((answer) => {
      const question = questions.get(answer.questionId);
      const points =
        quiz.kind === 'SURVEY' || !question ? 0 : gradeAnswer(question, answer.value as unknown as AnswerValue);
      return { id: answer.id, points };
    });
    const pending = graded.some((answer) => answer.points === null);
    const score =
      quiz.kind === 'SURVEY' ? null : graded.reduce((sum, answer) => sum + (answer.points ?? 0), 0);

    await this.prisma.$transaction([
      ...graded.map((answer) =>
        this.prisma.quizAnswer.update({ where: { id: answer.id }, data: { points: answer.points } }),
      ),
      this.prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { submittedAt, score, needsReview: pending, maxScore: totalPoints(quiz.questions) },
      }),
    ]);
    return this.prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id }, select: ATTEMPT_SELECT });
  }

  // ───────────── Resultados (docente) ─────────────

  /** Resumen por pregunta (como la pestaña «Respuestas» de Google Forms) y lista de alumnos. */
  async results(quizId: string, user: TokenPayload) {
    const quiz = await this.loadForManager(quizId, user);
    await this.finalizeExpired(quiz);
    const [attempts, enrolled] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { quizId },
        orderBy: [{ submittedAt: 'asc' }],
        select: {
          ...ATTEMPT_SELECT,
          student: { select: { id: true, fullName: true, username: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId: quiz.courseId },
        select: { student: { select: { id: true, fullName: true, username: true } } },
        orderBy: { student: { fullName: 'asc' } },
      }),
    ]);
    const submitted = attempts.filter((attempt) => attempt.submittedAt);
    const answersByQuestion = new Map<string, { value: unknown; points: Prisma.Decimal | null }[]>();
    for (const attempt of submitted) {
      for (const answer of attempt.answers) {
        const list = answersByQuestion.get(answer.questionId) ?? [];
        list.push(answer);
        answersByQuestion.set(answer.questionId, list);
      }
    }

    const summary = quiz.questions.map((q) => {
      const answers = answersByQuestion.get(q.id) ?? [];
      const base = { ...this.questionFields(q), answerKey: q.answerKey, answered: answers.length };
      const correct =
        quiz.kind === 'QUIZ' && q.points > 0
          ? answers.filter((answer) => decimalToNumber(answer.points) === q.points).length
          : null;
      if (q.type === 'SHORT' || q.type === 'PARAGRAPH') {
        return { ...base, correct, texts: answers.slice(-50).map((answer) => answerText(q, answer.value)) };
      }
      const counts: Record<string, number> = {};
      for (const answer of answers) {
        const value = answer.value as { option?: string; options?: string[] };
        for (const id of value.option ? [value.option] : (value.options ?? [])) counts[id] = (counts[id] ?? 0) + 1;
      }
      return { ...base, correct, counts };
    });

    const byStudent = new Map(attempts.map((attempt) => [attempt.studentId, attempt]));
    const students = enrolled.map(({ student }) => {
      const attempt = byStudent.get(student.id);
      return {
        student,
        attemptId: attempt?.id ?? null,
        status: !attempt ? 'not_started' : attempt.submittedAt ? 'submitted' : 'in_progress',
        submittedAt: attempt?.submittedAt ?? null,
        score: decimalToNumber(attempt?.score),
        needsReview: attempt?.needsReview ?? false,
      };
    });

    const scores = submitted.map((attempt) => decimalToNumber(attempt.score)).filter((s): s is number => s !== null);
    return {
      kind: quiz.kind,
      totalPoints: totalPoints(quiz.questions),
      responses: submitted.length,
      enrolled: enrolled.length,
      average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null,
      summary,
      students,
    };
  }

  /** Respuestas de un alumno, para revisarlas y calificar lo manual. */
  async attemptDetail(quizId: string, attemptId: string, user: TokenPayload) {
    const quiz = await this.loadForManager(quizId, user);
    const row = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      select: { ...ATTEMPT_SELECT, student: { select: { id: true, fullName: true, username: true } } },
    });
    if (!row) throw new NotFoundException('Respuesta no encontrada');
    const attempt = { ...(await this.finalizeIfExpired(row)), student: row.student };
    const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    return {
      id: attempt.id,
      kind: quiz.kind,
      student: attempt.student,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: decimalToNumber(attempt.score),
      maxScore: attempt.maxScore,
      needsReview: attempt.needsReview,
      questions: quiz.questions.map((q) => {
        const answer = answers.get(q.id);
        return {
          ...this.questionFields(q),
          answerKey: q.answerKey,
          answerId: answer?.id ?? null,
          answer: answer?.value ?? null,
          earned: answer ? decimalToNumber(answer.points) : quiz.kind === 'QUIZ' ? 0 : null,
        };
      }),
    };
  }

  /** El docente pone (o corrige) los puntos de una respuesta. */
  async gradeAnswer(answerId: string, points: number, user: TokenPayload) {
    const answer = await this.prisma.quizAnswer.findUnique({
      where: { id: answerId },
      select: {
        attemptId: true,
        question: { select: { points: true } },
        attempt: {
          select: {
            submittedAt: true,
            student: { select: { fullName: true } },
            quiz: {
              select: {
                id: true,
                courseId: true,
                kind: true,
                title: true,
                course: { select: { academicTerm: { select: { closed: true } } } },
              },
            },
          },
        },
      },
    });
    if (!answer) throw new NotFoundException('Respuesta no encontrada');
    await this.access.assertCanManage(answer.attempt.quiz.courseId, user);
    if (answer.attempt.quiz.kind === 'SURVEY') throw new BadRequestException('Las encuestas no se califican');
    if (!answer.attempt.submittedAt) throw new BadRequestException('El alumno todavía no envía sus respuestas');
    if (points > answer.question.points) {
      throw new BadRequestException(`La pregunta vale como máximo ${answer.question.points} puntos`);
    }
    if (answer.attempt.quiz.course.academicTerm.closed) {
      throw new ConflictException('El periodo está cerrado: las calificaciones ya no se pueden cambiar');
    }

    await this.prisma.quizAnswer.update({ where: { id: answerId }, data: { points } });
    const all = await this.prisma.quizAnswer.findMany({
      where: { attemptId: answer.attemptId },
      select: { points: true },
    });
    await this.prisma.quizAttempt.update({
      where: { id: answer.attemptId },
      data: {
        score: all.reduce((sum, item) => sum + (decimalToNumber(item.points) ?? 0), 0),
        needsReview: all.some((item) => item.points === null),
      },
    });
    this.activity.log({
      userId: user.sub,
      courseId: answer.attempt.quiz.courseId,
      action: 'QUIZ_GRADED',
      summary: `Calificó una respuesta de ${answer.attempt.student.fullName} en «${answer.attempt.quiz.title}»: ${points}/${answer.question.points}`,
    });
    return this.attemptDetail(answer.attempt.quiz.id, answer.attemptId, user);
  }

  async exportCsv(quizId: string, user: TokenPayload) {
    const quiz = await this.loadForManager(quizId, user);
    await this.finalizeExpired(quiz);
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId, submittedAt: { not: null } },
      orderBy: { student: { fullName: 'asc' } },
      select: { ...ATTEMPT_SELECT, student: { select: { fullName: true, username: true } } },
    });
    const graded = quiz.kind === 'QUIZ';
    const header = [
      'Matrícula',
      'Nombre',
      'Enviado',
      ...(graded ? ['Puntaje', 'Máximo', 'Por revisar'] : []),
      ...quiz.questions.map((q, index) => `${index + 1}. ${q.prompt.slice(0, 80)}`),
    ];
    const rows = attempts.map((attempt) => {
      const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer.value]));
      return [
        attempt.student.username,
        attempt.student.fullName,
        attempt.submittedAt?.toISOString().replace('T', ' ').slice(0, 16) ?? '',
        ...(graded
          ? [decimalToNumber(attempt.score), attempt.maxScore, attempt.needsReview ? 'Sí' : 'No']
          : []),
        ...quiz.questions.map((q) => answerText(q, answers.get(q.id))),
      ];
    });
    const content =
      '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
    const slug = quiz.title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'formulario';
    return { filename: `respuestas-${slug}.csv`, content };
  }

  // ───────────── Utilidades ─────────────

  private async loadForManager(quizId: string, user: TokenPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: QUIZ_SELECT });
    if (!quiz) throw new NotFoundException('Cuestionario no encontrado');
    await this.access.assertCanManage(quiz.courseId, user);
    return quiz;
  }

  private async loadForStudent(quizId: string, user: TokenPayload) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: QUIZ_SELECT });
    if (!quiz) throw new NotFoundException('Cuestionario no encontrado');
    const role = await this.access.roleIn(quiz.courseId, user);
    if (role !== 'student') throw new ForbiddenException('Solo los alumnos responden los formularios');
    if (!quiz.published) throw new NotFoundException('Cuestionario no encontrado');
    return quiz;
  }

  /** Cierra los intentos vencidos antes de mostrar resultados. */
  private async finalizeExpired(quiz: QuizRow) {
    const expired = await this.prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        submittedAt: null,
        deadlineAt: { lt: new Date(Date.now() - SUBMIT_GRACE_MS) },
      },
      select: ATTEMPT_SELECT,
    });
    for (const attempt of expired) await this.finalize(quiz, attempt, attempt.deadlineAt ?? new Date());
  }

  /** Ajustes validados: fechas en orden y resultados «después del cierre» con fecha de cierre. */
  private settingsFrom(
    dto: UpdateQuizDto,
    kind: QuizKind,
    current: { opensAt: Date | null; closesAt: Date | null; resultsVisibility?: string },
  ) {
    const opensAt = parseDate(dto.opensAt, 'apertura');
    const closesAt = parseDate(dto.closesAt, 'cierre');
    const finalOpens = opensAt === undefined ? current.opensAt : opensAt;
    const finalCloses = closesAt === undefined ? current.closesAt : closesAt;
    if (finalOpens && finalCloses && finalCloses <= finalOpens) {
      throw new BadRequestException('La fecha de cierre debe ser posterior a la de apertura');
    }
    const visibility = dto.resultsVisibility ?? current.resultsVisibility;
    if (kind === 'QUIZ' && visibility === 'AFTER_CLOSE' && !finalCloses) {
      throw new BadRequestException('Para mostrar resultados después del cierre, indica la fecha de cierre');
    }
    return {
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(opensAt !== undefined ? { opensAt } : {}),
      ...(closesAt !== undefined ? { closesAt } : {}),
      ...(dto.timeLimitMinutes !== undefined ? { timeLimitMinutes: dto.timeLimitMinutes } : {}),
      // Las encuestas no tienen resultados para el alumno.
      ...(dto.resultsVisibility !== undefined ? { resultsVisibility: kind === 'SURVEY' ? 'NEVER' : dto.resultsVisibility } : {}),
    } as const;
  }

  private questionData(q: ReturnType<typeof normalizeQuestions>[number], position: number) {
    return {
      position,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      required: q.required,
      options: (q.options ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
      answerKey: (q.answerKey ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
    };
  }

  private publicFields(quiz: QuizRow) {
    return {
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      kind: quiz.kind,
      opensAt: quiz.opensAt,
      closesAt: quiz.closesAt,
      timeLimitMinutes: quiz.timeLimitMinutes,
      resultsVisibility: quiz.resultsVisibility,
      window: quizWindow(quiz),
      questionCount: quiz.questions.length,
      totalPoints: totalPoints(quiz.questions),
      requiresKind: quiz.requiresKind,
      requiresId: quiz.requiresId,
    };
  }

  private questionFields(q: QuestionRow) {
    return {
      id: q.id,
      position: q.position,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      required: q.required,
      options: q.options,
    };
  }
}
