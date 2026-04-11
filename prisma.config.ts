import { defineConfig } from "prisma/config";
import fs from "fs";
import path from "path";

// Vercel 환경에서는 process.env.DATABASE_URL이 이미 주입되어 있음.
// 로컬 개발 환경용(.env.local 수동 파싱)
if (process.env.NODE_ENV !== "production") {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const dotenv = require("dotenv");
    dotenv.config({ path: envPath });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
