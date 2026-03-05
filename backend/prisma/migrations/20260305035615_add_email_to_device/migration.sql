/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `devices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "devices_email_key" ON "devices"("email");
