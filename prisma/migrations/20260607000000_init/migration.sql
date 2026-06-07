-- CreateEnum
CREATE TYPE "ScoreItemType" AS ENUM ('REWARD', 'PENALTY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classNo" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "Student" ADD CONSTRAINT "Student_grade_check" CHECK ("grade" >= 1 AND "grade" <= 9);

-- CreateTable
CREATE TABLE "ScoreItem" (
    "id" TEXT NOT NULL,
    "type" "ScoreItemType" NOT NULL,
    "mainCategory" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "imageUrl" TEXT,
    "score" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreTransaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scoreItemId" TEXT NOT NULL,
    "type" "ScoreItemType" NOT NULL,
    "scoreChange" INTEGER NOT NULL,
    "runningTotalScore" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_grade_idx" ON "Student"("grade");

-- CreateIndex
CREATE INDEX "Student_isDeleted_idx" ON "Student"("isDeleted");

-- CreateIndex
CREATE INDEX "ScoreItem_type_idx" ON "ScoreItem"("type");

-- CreateIndex
CREATE INDEX "ScoreItem_isDeleted_idx" ON "ScoreItem"("isDeleted");

-- CreateIndex
CREATE INDEX "ScoreTransaction_studentId_idx" ON "ScoreTransaction"("studentId");

-- CreateIndex
CREATE INDEX "ScoreTransaction_scoreItemId_idx" ON "ScoreTransaction"("scoreItemId");

-- CreateIndex
CREATE INDEX "ScoreTransaction_type_idx" ON "ScoreTransaction"("type");

-- CreateIndex
CREATE INDEX "ScoreTransaction_transactionDate_idx" ON "ScoreTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "ScoreTransaction_isDeleted_idx" ON "ScoreTransaction"("isDeleted");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_recordId_idx" ON "AuditLog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_account_key" ON "UserAccount"("account");

-- CreateIndex
CREATE INDEX "UserAccount_role_idx" ON "UserAccount"("role");

-- CreateIndex
CREATE INDEX "UserAccount_isDeleted_idx" ON "UserAccount"("isDeleted");

-- AddForeignKey
ALTER TABLE "ScoreTransaction" ADD CONSTRAINT "ScoreTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreTransaction" ADD CONSTRAINT "ScoreTransaction_scoreItemId_fkey" FOREIGN KEY ("scoreItemId") REFERENCES "ScoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
