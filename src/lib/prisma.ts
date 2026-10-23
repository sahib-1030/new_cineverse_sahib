import { query } from '@/lib/db';

/**
 * Lightweight Prisma-compatible raw query interface.
 * Implements tagged template literals for $executeRaw and $queryRaw with parameterized safety.
 */
export const prisma = {
  /**
   * Executes a raw SQL query using tagged template literals, returning affected row count.
   * Example: await prisma.$executeRaw`CALL sp_sahib_24bci0292_add_review(${userId}::int, ${movieId}::int, ${rating}::numeric, ${reviewText}::text)`;
   */
  async $executeRaw(strings: TemplateStringsArray, ...values: any[]): Promise<number> {
    let sql = '';
    const params: any[] = [];
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        sql += `$${params.length}`;
      }
    }
    const result = await query(sql, params);
    return result.rowCount;
  },

  /**
   * Executes a raw SQL query using tagged template literals, returning typed result rows.
   */
  async $queryRaw<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
    let sql = '';
    const params: any[] = [];
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        sql += `$${params.length}`;
      }
    }
    const result = await query<T>(sql, params);
    return result.rows;
  },
};

export default prisma;
