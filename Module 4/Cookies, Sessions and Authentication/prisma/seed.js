
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('SessionDemo!48', 10);

  await prisma.user.upsert({
    where: {
      email: 'sam@example.com',
    },
    update: {
      name: 'Sam',
      passwordHash,
    },
    create: {
      name: 'Sam',
      email: 'sam@example.com',
      passwordHash,
    },
  });

  console.log('Demo account: sam@example.com / SessionDemo!48');
}

main()
  .catch((error) => {
    console.error('Database seeding failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
