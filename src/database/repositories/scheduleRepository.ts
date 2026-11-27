import { db, initializeDatabase } from '../database';

export type RepeatType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type EventCategory =
  | 'personal'
  | 'lecture'
  | 'meeting'
  | 'work'
  | 'health'
  | 'payment'
  | 'other';

export type EventPriority = 'low' | 'medium' | 'high';

export interface Schedule {
  id: number;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_date: string | null;
  end_time: string | null;
  category: EventCategory;
  priority: EventPriority;
  repeat_type: RepeatType;
  reminder_enabled: number;
  notification_id: string | null;
  created_at: string;
}

export interface ScheduleReminder {
  id: number;
  schedule_id: number;
  occurrence_date: string;
  minutes_before: number;
  notification_id: string;
  trigger_at: number;
}

export interface ScheduleInput {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endDate?: string | null;
  endTime?: string | null;
  category: EventCategory;
  priority: EventPriority;
  repeatType: RepeatType;
  reminderEnabled: boolean;
}

export async function getAllSchedules(): Promise<Schedule[]> {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT * FROM schedules ORDER BY event_date ASC, start_time ASC`,
  );

  return result.rows as unknown as Schedule[];
}

export async function getSchedulesForDate(
  date: string,
): Promise<Schedule[]> {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT * FROM schedules
     WHERE event_date = ?
     OR (repeat_type != 'none' AND event_date <= ?)
     ORDER BY start_time ASC`,
    [date, date],
  );

  return (result.rows as unknown as Schedule[]).filter(item =>
    occursOnDate(item, date),
  );
}

export function occursOnDate(
  item: Schedule,
  date: string,
): boolean {
  if (date < item.event_date) return false;

  if (item.end_date && date > item.end_date) {
    return false;
  }

  if (item.repeat_type === 'none') {
    return date === item.event_date;
  }

  const start = new Date(`${item.event_date}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);

  const days = Math.round(
    (target.getTime() - start.getTime()) / 86400000,
  );

  if (item.repeat_type === 'daily') {
    return true;
  }

  if (item.repeat_type === 'weekly') {
    return days % 7 === 0;
  }

  if (item.repeat_type === 'monthly') {
    const lastDay = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0,
    ).getDate();

    return Math.min(start.getDate(), lastDay) === target.getDate();
  }

  if (item.repeat_type === 'yearly') {
    const lastDay = new Date(
      target.getFullYear(),
      start.getMonth() + 1,
      0,
    ).getDate();

    return (
      start.getMonth() === target.getMonth() &&
      Math.min(start.getDate(), lastDay) === target.getDate()
    );
  }

  return false;
}

export async function addSchedule(
  input: ScheduleInput,
): Promise<number> {
  await initializeDatabase();

  if (!input.title.trim()) {
    throw new Error('Event title is required.');
  }

  const result = await db.execute(
    `INSERT INTO schedules
      (
        title,
        description,
        event_date,
        start_time,
        end_date,
        end_time,
        category,
        priority,
        repeat_type,
        reminder_enabled
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title.trim(),
      input.description.trim(),
      input.eventDate,
      input.startTime,
      input.endDate || null,
      input.endTime || null,
      input.category,
      input.priority,
      input.repeatType,
      input.reminderEnabled ? 1 : 0,
    ],
  );

  return result.insertId ?? 0;
}

export async function updateSchedule(
  id: number,
  input: ScheduleInput,
): Promise<void> {
  await initializeDatabase();

  await db.execute(
    `UPDATE schedules
     SET
       title = ?,
       description = ?,
       event_date = ?,
       start_time = ?,
       end_date = ?,
       end_time = ?,
       category = ?,
       priority = ?,
       repeat_type = ?,
       reminder_enabled = ?
     WHERE id = ?`,
    [
      input.title.trim(),
      input.description.trim(),
      input.eventDate,
      input.startTime,
      input.endDate || null,
      input.endTime || null,
      input.category,
      input.priority,
      input.repeatType,
      input.reminderEnabled ? 1 : 0,
      id,
    ],
  );
}

export async function deleteSchedule(id: number): Promise<void> {
  await initializeDatabase();

  await db.execute(
    'DELETE FROM schedule_reminders WHERE schedule_id = ?',
    [id],
  );

  await db.execute(
    'DELETE FROM schedules WHERE id = ?',
    [id],
  );
}

export async function getScheduleReminderIds(
  scheduleId: number,
): Promise<string[]> {
  await initializeDatabase();

  const result = await db.execute(
    'SELECT notification_id FROM schedule_reminders WHERE schedule_id = ?',
    [scheduleId],
  );

  return result.rows
    .map(row => String(row.notification_id))
    .filter(Boolean);
}

export async function clearScheduleReminders(
  scheduleId: number,
): Promise<void> {
  await initializeDatabase();

  await db.execute(
    'DELETE FROM schedule_reminders WHERE schedule_id = ?',
    [scheduleId],
  );
}

export async function addScheduleReminder(
  scheduleId: number,
  occurrenceDate: string,
  minutesBefore: number,
  notificationId: string,
  triggerAt: number,
): Promise<void> {
  await initializeDatabase();

  await db.execute(
    `INSERT INTO schedule_reminders
      (
        schedule_id,
        occurrence_date,
        minutes_before,
        notification_id,
        trigger_at
      )
     VALUES (?, ?, ?, ?, ?)`,
    [
      scheduleId,
      occurrenceDate,
      minutesBefore,
      notificationId,
      triggerAt,
    ],
  );
}