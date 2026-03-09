-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "blockAll" BOOLEAN NOT NULL DEFAULT false,
    "blockUsers" BOOLEAN NOT NULL DEFAULT false,
    "blockAdmins" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
