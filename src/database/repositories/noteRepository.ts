
import { db, initializeDatabase } from '../database';

export interface Note {
  id: number;
  title: string;
  content: string;
  is_shopping_list: number;
  created_at: string;
  updated_at: string;
}

export const getAllNotes = async (): Promise<Note[]> => {
  await initializeDatabase();

  const result = await db.execute(`
    SELECT * FROM notes
    ORDER BY updated_at DESC
  `);

  return result.rows as unknown as Note[];
};

export const addNote = async (
  title: string,
  content: string,
  isShoppingList = false,
): Promise<number> => {
  await initializeDatabase();

  if (!title.trim()) {
    throw new Error('Title is required.');
  }

  const result = await db.execute(
    `INSERT INTO notes (title, content, is_shopping_list)
     VALUES (?, ?, ?)`,
    [title.trim(), content, isShoppingList ? 1 : 0],
  );

  return result.insertId ?? 0;
};

export const updateNote = async (
  id: number,
  title: string,
  content: string,
  isShoppingList = false,
): Promise<void> => {
  await initializeDatabase();

  if (!title.trim()) {
    throw new Error('Title is required.');
  }

  await db.execute(
    `UPDATE notes
     SET title = ?,
         content = ?,
         is_shopping_list = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title.trim(), content, isShoppingList ? 1 : 0, id],
  );
};

export const deleteNote = async (id: number): Promise<void> => {
  await initializeDatabase();

  await db.execute(
    'DELETE FROM notes WHERE id = ?',
    [id],
  );
};
