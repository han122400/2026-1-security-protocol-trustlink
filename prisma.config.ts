import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local 파일을 우선 로드
dotenv.config({ path: ".env.local" });
dotenv.config(); // .env 폴백

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/trustlink",
  },
});
