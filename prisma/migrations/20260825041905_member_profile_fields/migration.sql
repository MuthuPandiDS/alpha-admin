-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "weightKg" REAL,
    "heightCm" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "planExpiresAt" DATETIME,
    "planNotes" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "fitnessGoal" TEXT,
    "joinSource" TEXT NOT NULL DEFAULT 'ADMIN',
    "profileCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "heightCm", "id", "image", "name", "paymentStatus", "planExpiresAt", "planNotes", "role", "updatedAt", "weightKg") SELECT "createdAt", "email", "emailVerified", "heightCm", "id", "image", "name", "paymentStatus", "planExpiresAt", "planNotes", "role", "updatedAt", "weightKg" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_planExpiresAt_idx" ON "User"("planExpiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
