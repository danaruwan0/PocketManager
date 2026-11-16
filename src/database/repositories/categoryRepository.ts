
import { db, initializeDatabase } from '../database';

export type CategoryType = 'income' | 'expense';

export type Occupation =
  | 'student'
  | 'employee'
  | 'farmer'
  | 'fisherman'
  | 'business'
  | 'all';

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  occupation: Occupation;
  is_custom: number;
  created_at: string;
}


type CategoryRow = {
  id: number;
  name: string;
  type: CategoryType;
  occupation: Occupation;
  is_custom: number;
  created_at: string;
};

export interface CreateCategory {
  name: string;
  type: CategoryType;
  occupation: Occupation;
}

// Validate category data
const validateCategory = (data: CreateCategory): void => {
  if (!data.name.trim()) {
    throw new Error('Category name is required.');
  }

  if (!['income', 'expense'].includes(data.type)) {
    throw new Error('Invalid category type.');
  }

  const occupations: Occupation[] = [
    'student',
    'employee',
    'farmer',
    'fisherman',
    'business',
    'all',
  ];

  if (!occupations.includes(data.occupation)) {
    throw new Error('Invalid occupation.');
  }
};

// Get categories for an occupation
// Includes common categories with occupation = 'all'
export const getCategories = async (
  occupation: Occupation,
  type?: CategoryType,
): Promise<Category[]> => {
  await initializeDatabase();

  let query = `
    SELECT *
    FROM categories
    WHERE (occupation = ? OR occupation = 'all')
  `;

  const params: (string | number)[] = [occupation];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += `
    ORDER BY
      CASE WHEN occupation = ? THEN 0 ELSE 1 END,
      name ASC
  `;

  params.push(occupation);

  const result = await db.execute(query, params);

//   return result.rows as Category[];             // Return the rows as an array of Category objects
  return result.rows as unknown as Category[];
};

// Get income categories
export const getIncomeCategories = async (
  occupation: Occupation,
): Promise<Category[]> => {
  return getCategories(occupation, 'income');
};

// Get expense categories
export const getExpenseCategories = async (
  occupation: Occupation,
): Promise<Category[]> => {
  return getCategories(occupation, 'expense');
};

// Get a category by ID
export const getCategoryById = async (
  id: number,
): Promise<Category | null> => {
  await initializeDatabase();

  const result = await db.execute(
    'SELECT * FROM categories WHERE id = ?',
    [id],
  );

//   return (result.rows[0] as Category) || null;    // Return the first row as a Category object or null if not found
return (result.rows[0] as unknown as Category) || null;

};

// Add a custom category
export const addCustomCategory = async (
  data: CreateCategory,
): Promise<number> => {
  await initializeDatabase();

  validateCategory(data);

  const result = await db.execute(
    `INSERT INTO categories
      (name, type, occupation, is_custom)
     VALUES (?, ?, ?, 1)`,
    [
      data.name.trim(),
      data.type,
      data.occupation,
    ],
  );

//   return result.insertId;     // Return the ID of the newly inserted category
if (result.insertId === undefined) {
  throw new Error('Failed to create category.');
}

return result.insertId;
};

// Update a custom category
export const updateCustomCategory = async (
  id: number,
  newName: string,
): Promise<void> => {
  await initializeDatabase();

  if (!newName.trim()) {
    throw new Error('Category name is required.');
  }

  const category = await getCategoryById(id);

  if (!category) {
    throw new Error('Category not found.');
  }

  if (category.is_custom !== 1) {
    throw new Error('Default categories cannot be edited.');
  }

  await db.execute(
    `UPDATE categories
     SET name = ?
     WHERE id = ? AND is_custom = 1`,
    [newName.trim(), id],
  );
};

// Delete a custom category
export const deleteCustomCategory = async (
  id: number,
): Promise<void> => {
  await initializeDatabase();

  const category = await getCategoryById(id);

  if (!category) {
    throw new Error('Category not found.');
  }

  if (category.is_custom !== 1) {
    throw new Error('Default categories cannot be deleted.');
  }

  // Prevent deleting categories used by transactions
  const usage = await db.execute(
    `SELECT COUNT(*) AS total
     FROM transactions
     WHERE category_id = ?`,
    [id],
  );

  const transactionCount = Number(
    usage.rows[0]?.total ?? 0,
  );

  if (transactionCount > 0) {
    throw new Error(
      'This category is already used in transactions. It cannot be deleted.',
    );
  }

  await db.execute(
    'DELETE FROM categories WHERE id = ? AND is_custom = 1',
    [id],
  );
};

// Get all custom categories
export const getCustomCategories = async (
  occupation: Occupation,
): Promise<Category[]> => {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT *
     FROM categories
     WHERE occupation = ?
       AND is_custom = 1
     ORDER BY name ASC`,
    [occupation],
  );

//   return result.rows as Category[];   // Return the rows as an array of Category objects

return result.rows as unknown as Category[];
};
