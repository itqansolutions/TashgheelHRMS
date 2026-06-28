const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // get a random job id
    const job = await prisma.jobOpening.findFirst({
        where: { embedding: { not: null } }
    });
    
    if (!job) {
        console.log("No jobs with embeddings found.");
        return;
    }

    console.log("Found job:", job.id);
    
    const rawMatches = await prisma.$queryRawUnsafe(`
        SELECT c.id, 1 - (c.embedding <=> j.embedding) AS match_score
        FROM "candidates" c, "job_openings" j
        WHERE j.id = $1::uuid
          AND c.embedding IS NOT NULL
          AND j.embedding IS NOT NULL
        ORDER BY c.embedding <=> j.embedding ASC
        LIMIT $2::int;
      `, job.id, 10);
      
    console.log("Raw matches:", rawMatches);
  } catch(err) {
      console.error(err);
  } finally {
      await prisma.$disconnect();
  }
}

test();
