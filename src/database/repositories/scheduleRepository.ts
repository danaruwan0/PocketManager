
import { db, initializeDatabase } from '../database';

export interface Schedule {
  id: number;
  title: string;
  description: string;
  event_date: string;
  notification_id: string | null;
  created_at: string;
}

export const getAllSchedules = async (): Promise<Schedule[]> => {
  await initializeDatabase();

  const result = await db.execute(`
    SELECT * FROM schedules
    ORDER BY event_date ASC
  `);

  return result.rows as unknown as Schedule[];
};

export const addSchedule = async (
  title: string,
  description: string,
  eventDate: string,
  notificationId: string | null,
): Promise<number> => {
  await initializeDatabase();

  if (!title.trim()) {
    throw new Error('Schedule title is required.');
  }

  const result = await db.execute(
    `INSERT INTO schedules
      (title, description, event_date, notification_id)
     VALUES (?, ?, ?, ?)`,
    [title.trim(), description, eventDate, notificationId],
  );

  return result.insertId ?? 0;
};

export const deleteSchedule = async (
  id: number,
): Promise<void> => {
  await initializeDatabase();

  await db.execute(
    'DELETE FROM schedules WHERE id = ?',
    [id],
  );
};
