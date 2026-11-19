-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SWISS', 'KNOCKOUT');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'CHECK_IN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PairingResult" AS ENUM ('PENDING', 'P1_WIN', 'P2_WIN', 'DRAW', 'BYE', 'NO_SHOW_P1', 'NO_SHOW_P2');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "tournamentId" TEXT,
ADD COLUMN     "tournamentPairingId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "schoolName" TEXT;

-- CreateTable
CREATE TABLE "TrustedSchoolIp" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustedSchoolIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "schoolName" TEXT,
    "format" "TournamentFormat" NOT NULL DEFAULT 'SWISS',
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTRATION',
    "totalRounds" INTEGER NOT NULL DEFAULT 5,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "setsPerMatch" INTEGER NOT NULL DEFAULT 2,
    "turnTimeLimitSecs" INTEGER NOT NULL DEFAULT 59,
    "affectsGlobalElo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classLabel" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buchholz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "disqualified" BOOLEAN NOT NULL DEFAULT false,
    "lastIp" TEXT,
    "lastFingerprint" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPairing" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "setNumber" INTEGER NOT NULL DEFAULT 1,
    "p1SetWins" INTEGER NOT NULL DEFAULT 0,
    "p2SetWins" INTEGER NOT NULL DEFAULT 0,
    "result" "PairingResult" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPairing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustedSchoolIp_ipAddress_key" ON "TrustedSchoolIp"("ipAddress");

-- CreateIndex
CREATE INDEX "TrustedSchoolIp_isActive_ipAddress_idx" ON "TrustedSchoolIp"("isActive", "ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_joinCode_key" ON "Tournament"("joinCode");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");

-- CreateIndex
CREATE INDEX "TournamentParticipant_tournamentId_points_idx" ON "TournamentParticipant"("tournamentId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "TournamentPairing_tournamentId_round_idx" ON "TournamentPairing"("tournamentId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPairing_tournamentId_round_tableNumber_key" ON "TournamentPairing"("tournamentId", "round", "tableNumber");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_tournamentPairingId_idx" ON "Match"("tournamentPairingId");

-- AddForeignKey
ALTER TABLE "TrustedSchoolIp" ADD CONSTRAINT "TrustedSchoolIp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPairing" ADD CONSTRAINT "TournamentPairing_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPairing" ADD CONSTRAINT "TournamentPairing_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPairing" ADD CONSTRAINT "TournamentPairing_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentPairingId_fkey" FOREIGN KEY ("tournamentPairingId") REFERENCES "TournamentPairing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
