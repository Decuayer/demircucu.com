-- Separate database for automated tests; dev data in demircucu_dev is never touched by tests.
CREATE DATABASE demircucu_test;
-- Scratch database Prisma uses as shadow for migrate dev / migrate diff.
CREATE DATABASE demircucu_shadow;
