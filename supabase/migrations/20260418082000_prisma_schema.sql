
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('PLATFORM_ADMIN', 'BRIGADE_DIRECTOR');

-- CreateEnum
CREATE TYPE "BrigadeRole" AS ENUM ('DIRECTOR', 'CO_DIRECTOR', 'STAFF');

-- CreateEnum
CREATE TYPE "BrigadeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TurnoStatus" AS ENUM ('WAITING', 'CALLED', 'SERVED', 'MOVED', 'REMOVED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "AppRole" NOT NULL DEFAULT 'BRIGADE_DIRECTOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigades" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "BrigadeStatus" NOT NULL DEFAULT 'DRAFT',
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brigades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "brigade_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" VARCHAR(4) NOT NULL,
    "color" VARCHAR(9) NOT NULL,
    "patient_limit" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "public_dashboard_token" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigade_members" (
    "id" UUID NOT NULL,
    "brigade_id" UUID NOT NULL,
    "profile_id" UUID,
    "email" TEXT NOT NULL,
    "role" "BrigadeRole" NOT NULL DEFAULT 'STAFF',
    "generated_username" TEXT,
    "generated_password_hash" TEXT,
    "invite_token" UUID,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "retain_access_after_close" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brigade_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "brigade_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" VARCHAR(16) NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "wants_church_visit" BOOLEAN NOT NULL DEFAULT false,
    "global_order" INTEGER NOT NULL,
    "registered_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" UUID NOT NULL,
    "brigade_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "area_order" INTEGER NOT NULL,
    "status" "TurnoStatus" NOT NULL DEFAULT 'WAITING',
    "called_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "moved_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brigades_created_by_idx" ON "brigades"("created_by");

-- CreateIndex
CREATE INDEX "brigades_status_idx" ON "brigades"("status");

-- CreateIndex
CREATE UNIQUE INDEX "areas_public_dashboard_token_key" ON "areas"("public_dashboard_token");

-- CreateIndex
CREATE INDEX "areas_brigade_id_order_idx" ON "areas"("brigade_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "brigade_members_generated_username_key" ON "brigade_members"("generated_username");

-- CreateIndex
CREATE UNIQUE INDEX "brigade_members_invite_token_key" ON "brigade_members"("invite_token");

-- CreateIndex
CREATE INDEX "idx_members_profile" ON "brigade_members"("profile_id", "brigade_id");

-- CreateIndex
CREATE UNIQUE INDEX "brigade_members_brigade_id_profile_id_key" ON "brigade_members"("brigade_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "brigade_members_brigade_id_email_key" ON "brigade_members"("brigade_id", "email");

-- CreateIndex
CREATE INDEX "idx_patients_brigade_order" ON "patients"("brigade_id", "global_order");

-- CreateIndex
CREATE UNIQUE INDEX "patients_brigade_id_global_order_key" ON "patients"("brigade_id", "global_order");

-- CreateIndex
CREATE INDEX "idx_turnos_brigade_status" ON "turnos"("brigade_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_area_id_area_order_key" ON "turnos"("area_id", "area_order");

-- AddForeignKey
ALTER TABLE "brigades" ADD CONSTRAINT "brigades_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_brigade_id_fkey" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigade_members" ADD CONSTRAINT "brigade_members_brigade_id_fkey" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigade_members" ADD CONSTRAINT "brigade_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_brigade_id_fkey" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_brigade_id_fkey" FOREIGN KEY ("brigade_id") REFERENCES "brigades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

