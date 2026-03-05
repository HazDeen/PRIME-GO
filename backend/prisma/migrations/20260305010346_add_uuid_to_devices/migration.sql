/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `devices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "devices_uuid_key" ON "devices"("uuid");
