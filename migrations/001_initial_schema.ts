import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MigrationBuilder } from 'node-pg-migrate';

const sqlPath = (name: string) => resolve(process.cwd(), 'migrations', 'sql', name);

export function up(pgm: MigrationBuilder): void {
  pgm.sql(readFileSync(sqlPath('001_initial_schema.up.sql'), 'utf8'));
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql(readFileSync(sqlPath('001_initial_schema.down.sql'), 'utf8'));
}
