import { ClipboardList, Megaphone, MessageCircle, Star, type LucideIcon } from "lucide-react";
import type { NotificationType } from "@/lib/classwork";

export const NOTIFICATION_ICON: Record<NotificationType, LucideIcon> = {
  ASSIGNMENT_CREATED: ClipboardList,
  SUBMISSION_RETURNED: Star,
  POST_CREATED: Megaphone,
  COMMENT_CREATED: MessageCircle,
};
