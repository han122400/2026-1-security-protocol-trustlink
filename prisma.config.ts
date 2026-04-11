import { defineConfig } from "prisma/config";
import fs from "fs";
import path from "path";

if (process.env.NODE_ENV !== "production") {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const dotenv = require("dotenv");
    dotenv.config({ path: envPath });
  }
}

// Vercel 런타임 버그로 인한 localhost 폴백 에러를 완벽히 차단하기 위해 하드코딩된 실제 DB 주소 추가
const connectionUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_jCm0XnANlPu2@ep-cool-sun-an94lelo-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: connectionUrl,
  },
});
