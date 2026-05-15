import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaMigration1714521600000 implements MigrationInterface {
  name = 'InitialSchemaMigration1714521600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create User role enum
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('admin','librarian','member')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL UNIQUE,
        "passwordHash" varchar(255) NOT NULL,
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'member',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);

    // Create Item type enum
    await queryRunner.query(`
      CREATE TYPE "items_type_enum" AS ENUM ('book','magazine','equipment')
    `);

    // Create items table
    await queryRunner.query(`
      CREATE TABLE "items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(32) NOT NULL UNIQUE,
        "title" varchar(255) NOT NULL,
        "type" "items_type_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_items_code" ON "items" ("code")`);

    // Create Loan status enum
    await queryRunner.query(`
      CREATE TYPE "loans_status_enum" AS ENUM ('active','returned','overdue','lost')
    `);

    // Create Loan priority enum
    await queryRunner.query(`
      CREATE TYPE "loans_priority_enum" AS ENUM ('normal','urgent')
    `);

    // Create loans table
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "itemId" uuid NOT NULL REFERENCES "items"("id") ON DELETE RESTRICT,
        "loanedAt" timestamptz NOT NULL,
        "dueAt" timestamptz NOT NULL,
        "returnedAt" timestamptz NULL,
        "status" "loans_status_enum" NOT NULL DEFAULT 'active',
        "priority" "loans_priority_enum" NOT NULL DEFAULT 'normal',
        "fineAmount" decimal(10,2) NOT NULL DEFAULT '0.00',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_loans_item_status" ON "loans" ("itemId","status")`);
    await queryRunner.query(`CREATE INDEX "IDX_loans_user_status" ON "loans" ("userId","status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "loans"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loans_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loans_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "items_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}