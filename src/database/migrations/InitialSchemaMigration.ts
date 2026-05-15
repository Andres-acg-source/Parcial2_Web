import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaMigration1678886400000 implements MigrationInterface {

    name = 'InitialSchemaMigration1678886400000';

    async up(queryRunner: QueryRunner): Promise<void> {
        // Create User table
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, generated: "uuid_generate_v4" },
                { name: "email", type: "varchar", isUnique: true },
                { name: "passwordHash", type: "varchar" },
                { name: "firstName", type: "varchar" },
                { name: "lastName", type: "varchar" },
                { name: "role", type: "enum", enum: ["admin", "librarian", "member"], default: "'member'" },
                { name: "isActive", type: "boolean", default: true },
                { name: "createdAt", type: "timestamp", default: "now()" },
                { name: "updatedAt", type: "timestamp", default: "now()" }
            ],
        }), true);

        // Add indexes for users
        await queryRunner.createIndex("users", new TableIndex({
            name: "IDX_USERS_EMAIL",
            columnNames: ["email"],
            unique: true,
        }));

        // Create Item table
        await queryRunner.createTable(new Table({
            name: "items",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, generated: "uuid_generate_v4" },
                { name: "code", type: "varchar", isUnique: true },
                { name: "title", type: "varchar" },
                { name: "type", type: "enum", enum: ["book", "magazine", "equipment"] },
                { name: "isActive", type: "boolean", default: true },
                { name: "createdAt", type: "timestamp", default: "now()" },
                { name: "updatedAt", type: "timestamp", default: "now()" }
            ],
        }), true);

        // Create Loan table
        await queryRunner.createTable(new Table({
            name: "loans",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, generated: "uuid_generate_v4" },
                { name: "userId", type: "uuid" },
                { name: "itemId", type: "uuid" },
                { name: "loanedAt", type: "timestamp with time zone" },
                { name: "dueAt", type: "timestamp with time zone" },
                { name: "returnedAt", type: "timestamp with time zone", isNullable: true },
                { name: "status", type: "enum", enum: ["active", "returned", "overdue", "lost"], default: "'active'" },
                { name: "priority", type: "enum", enum: ["normal", "urgent"], default: "'normal'" },
                { name: "fineAmount", type: "decimal", precision: 10, scale: 2, default: "0.00" },
                { name: "createdAt", type: "timestamp", default: "now()" },
                { name: "updatedAt", type: "timestamp", default: "now()" }
            ],
        }), true);

        // Add foreign keys
        await queryRunner.createForeignKey("loans", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "RESTRICT",
        }));

        await queryRunner.createForeignKey("loans", new TableForeignKey({
            columnNames: ["itemId"],
            referencedColumnNames: ["id"],
            referencedTableName: "items",
            onDelete: "RESTRICT",
        }));

        // Add indexes
        await queryRunner.createIndex("loans", new TableIndex({
            name: "IDX_LOANS_ITEM_STATUS",
            columnNames: ["itemId", "status"],
        }));

        await queryRunner.createIndex("loans", new TableIndex({
            name: "IDX_LOANS_USER_STATUS",
            columnNames: ["userId", "status"],
        }));
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("loans");
        await queryRunner.dropTable("items");
        await queryRunner.dropTable("users");
    }
}