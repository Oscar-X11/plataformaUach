import {
  Bell,
  BookUp,
  ClipboardCheck,
  ClipboardList,
  Library,
  Megaphone,
  MessageCircle,
  School,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/lib/classwork";

/** Un ícono por tipo. El Record obliga a agregar aquí cada tipo nuevo del backend. */
const NOTIFICATION_ICON: Record<NotificationType, LucideIcon> = {
  ASSIGNMENT_CREATED: ClipboardList,
  SUBMISSION_RETURNED: Star,
  POST_CREATED: Megaphone,
  COMMENT_CREATED: MessageCircle,
  MATERIAL_CREATED: BookUp,
  RESOURCE_REVIEWED: Library,
  COURSE_ASSIGNED: School,
  QUIZ_PUBLISHED: ClipboardCheck,
};

/**
 * Ícono del aviso. Si el backend envía un tipo que esta versión del frontend no
 * conoce, se usa la campana en lugar de romper la página.
 */
export function notificationIcon(type: string): LucideIcon {
  return NOTIFICATION_ICON[type as NotificationType] ?? Bell;
}
