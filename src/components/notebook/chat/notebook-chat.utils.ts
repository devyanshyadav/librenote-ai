import type { NotebookChatUIMessage } from "@/types";

export { getChatMessageText } from "@/lib/chat/message-utils";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInCalendarDays(later: Date, earlier: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(later).getTime() - startOfDay(earlier).getTime()) / msPerDay,
  );
}

export function getChatMessageDate(message: NotebookChatUIMessage): Date {
  const createdAt = message.metadata?.createdAt;
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function isSameChatDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatChatDateSeparator(date: Date): string {
  const now = new Date();
  const dayDiff = differenceInCalendarDays(now, date);

  if (dayDiff === 0) {
    return "Today";
  }

  if (dayDiff === 1) {
    return "Yesterday";
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function shouldShowChatDateSeparator(
  messages: NotebookChatUIMessage[],
  index: number,
): boolean {
  if (index === 0) {
    return true;
  }

  const currentDate = getChatMessageDate(messages[index]);
  const previousDate = getChatMessageDate(messages[index - 1]);

  return !isSameChatDay(currentDate, previousDate);
}
