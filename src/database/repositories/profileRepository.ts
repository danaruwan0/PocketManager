
import { db, initializeDatabase } from '../database';

export interface UserProfile {
  id: number;
  name: string;
  occupation: string;
  currency: string;
  monthly_income: number;
  profile_image: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProfileInput = Pick<
  UserProfile,
  'name' | 'occupation' | 'currency' | 'monthly_income'
> & {
  profile_image?: string | null;
};

const validateProfile = (data: ProfileInput) => {
  if (!data.name.trim()) {
    throw new Error('Full name is required.');
  }

  if (!data.occupation.trim()) {
    throw new Error('Occupation is required.');
  }

  if (!data.currency.trim()) {
    throw new Error('Currency is required.');
  }

  if (
    !Number.isFinite(data.monthly_income) ||
    data.monthly_income < 0
  ) {
    throw new Error('Monthly income must be zero or greater.');
  }
};

export const getProfile = async (): Promise<UserProfile | null> => {
  await initializeDatabase();

  const result = await db.execute(`
    SELECT id, name, occupation, currency, monthly_income,
           profile_image, created_at, updated_at
    FROM user_profile
    ORDER BY id DESC
    LIMIT 1
  `);

  const row = result.rows[0];

  if (!row) return null;

  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    occupation: String(row.occupation ?? ''),
    currency: String(row.currency ?? 'LKR'),
    monthly_income: Number(row.monthly_income ?? 0),
    profile_image:
      row.profile_image == null
        ? null
        : String(row.profile_image),
    created_at:
      row.created_at == null
        ? undefined
        : String(row.created_at),
    updated_at:
      row.updated_at == null
        ? undefined
        : String(row.updated_at),
  };
};

export const addProfile = async (
  data: ProfileInput,
): Promise<number> => {
  await initializeDatabase();
  validateProfile(data);

  const result = await db.execute(
    `INSERT INTO user_profile
      (name, occupation, currency, monthly_income, profile_image)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.name.trim(),
      data.occupation.trim(),
      data.currency.trim().toUpperCase(),
      data.monthly_income,
      data.profile_image ?? null,
    ],
  );

  if (result.insertId == null) {
    throw new Error('Could not create profile.');
  }

  return result.insertId;
};

export const updateProfile = async (
  id: number,
  data: ProfileInput,
): Promise<void> => {
  await initializeDatabase();

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid profile ID.');
  }

  validateProfile(data);

  const result = await db.execute(
    `UPDATE user_profile
     SET name = ?, occupation = ?, currency = ?,
         monthly_income = ?, profile_image = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.name.trim(),
      data.occupation.trim(),
      data.currency.trim().toUpperCase(),
      data.monthly_income,
      data.profile_image ?? null,
      id,
    ],
  );

  if (result.rowsAffected === 0) {
    throw new Error('Profile not found.');
  }
};

export const deleteProfile = async (
  id: number,
): Promise<void> => {
  await initializeDatabase();

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid profile ID.');
  }

  await db.execute(
    'DELETE FROM user_profile WHERE id = ?',
    [id],
  );
};


