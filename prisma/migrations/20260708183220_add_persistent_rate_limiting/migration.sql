-- CreateTable
CREATE TABLE "registration_limits" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_failures" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_failures_pkey" PRIMARY KEY ("id")
);
