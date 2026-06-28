const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.jobOpening.findFirst();
  if (!job) {
    console.log("No job opening found");
    return;
  }
  
  try {
    const rawMatches = await prisma.$queryRawUnsafe(`
      SELECT c.id, 1 - (c.embedding <=> j.embedding) AS match_score
      FROM "candidates" c, "job_openings" j
      WHERE j.id = $1::uuid
        AND c.embedding IS NOT NULL
        AND j.embedding IS NOT NULL
      ORDER BY c.embedding <=> j.embedding ASC
      LIMIT $2::int;
    `, job.id, 10);
    console.log("SUCCESS:", rawMatches);
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}
main().finally(() => prisma.$disconnect());
