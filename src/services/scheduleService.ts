import {
  addScheduleReminder,
  clearScheduleReminders,
  getAllSchedules,
  getScheduleReminderIds,
  Schedule,
} from '../database/repositories/scheduleRepository';

import {
  cancelNotification,
  cancelNotifications,
  initializeNotifications,
  scheduleNotification,
} from './notificationService';

export const DEFAULT_REMINDERS = [1440, 30, 5, 1, 0];

const MAX_PENDING_REMINDERS = 48;
const REPEAT_OCCURRENCES_TO_QUEUE = 6;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addOccurrence(
  date: Date,
  repeat: Schedule['repeat_type'],
  count: number,
): Date {
  const next = new Date(date);

  if (repeat === 'daily') {
    next.setDate(next.getDate() + count);
  }

  if (repeat === 'weekly') {
    next.setDate(next.getDate() + count * 7);
  }

  if (repeat === 'monthly') {
    const day = next.getDate();

    next.setDate(1);
    next.setMonth(next.getMonth() + count);

    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();

    next.setDate(Math.min(day, lastDay));
  }

  if (repeat === 'yearly') {
    const day = next.getDate();

    next.setDate(1);
    next.setFullYear(next.getFullYear() + count);

    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();

    next.setDate(Math.min(day, lastDay));
  }

  return next;
}

function occurrenceDates(item: Schedule): Date[] {
  const [year, month, day] = item.event_date.split('-').map(Number);
  const [hour, minute] = item.start_time.split(':').map(Number);

  const first = new Date(
    year,
    month - 1,
    day,
    hour || 0,
    minute || 0,
    0,
    0,
  );

  const occurrences: Date[] = [];

  let index = 0;

  if (item.repeat_type !== 'none') {
    while (
      index < 10000 &&
      addOccurrence(first, item.repeat_type, index).getTime() <= Date.now()
    ) {
      index += 1;
    }
  }

  const count =
    item.repeat_type === 'none'
      ? 1
      : REPEAT_OCCURRENCES_TO_QUEUE;

  for (let i = 0; i < count; i++) {
    const occurrence = addOccurrence(
      first,
      item.repeat_type,
      index + i,
    );

    if (item.end_date && dateKey(occurrence) > item.end_date) {
      break;
    }

    if (occurrence.getTime() > Date.now()) {
      occurrences.push(occurrence);
    }
  }

  return occurrences;
}

export async function refreshScheduleNotifications(
  _scheduleId?: number,
): Promise<void> {
  await initializeNotifications();

  const schedules = await getAllSchedules();

  const candidates: Array<{
    item: Schedule;
    occurrence: Date;
    minutesBefore: number;
    triggerAt: number;
  }> = [];

  for (const item of schedules) {
    const ids = await getScheduleReminderIds(item.id);

    await cancelNotifications(ids);

    if (item.notification_id) {
      await cancelNotification(item.notification_id);
    }

    await clearScheduleReminders(item.id);

    if (!item.reminder_enabled) {
      continue;
    }

    for (const occurrence of occurrenceDates(item)) {
      for (const minutesBefore of DEFAULT_REMINDERS) {
        const triggerAt =
          occurrence.getTime() - minutesBefore * 60000;

        if (triggerAt > Date.now()) {
          candidates.push({
            item,
            occurrence,
            minutesBefore,
            triggerAt,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => a.triggerAt - b.triggerAt);

  for (const candidate of candidates.slice(0, MAX_PENDING_REMINDERS)) {
    const {
      item,
      occurrence,
      minutesBefore,
      triggerAt,
    } = candidate;

    const label =
      minutesBefore === 0
        ? 'Your event starts now.'
        : minutesBefore >= 1440
          ? `Your event is in ${Math.round(minutesBefore / 1440)} day(s).`
          : `Your event is in ${minutesBefore} minute(s).`;

    const notificationId = await scheduleNotification(
      item.title,
      `${label}${item.description ? ` ${item.description}` : ''}`,
      new Date(triggerAt),
    );

    await addScheduleReminder(
      item.id,
      dateKey(occurrence),
      minutesBefore,
      notificationId,
      triggerAt,
    );
  }
}

export async function deleteScheduleNotifications(
  scheduleId: number,
): Promise<void> {
  const ids = await getScheduleReminderIds(scheduleId);

  await cancelNotifications(ids);
}