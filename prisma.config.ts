import { defineConfig as composer } from "@prisma/composer/config";
import { defineConfig as orm, prisma7Schema } from "@prisma/orm-postgres/config";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: orm({
    contract: prisma7Schema("prisma/schema.prisma"),
    output: "src/prisma",
    db: { connection: process.env["DATABASE_URL"]! },
  }),
  composer: composer({
    entry: "./module.mjs",
    extensions: [prismaCloud(), nextjsBuild()],
    state: prismaState(),
  }),
});
