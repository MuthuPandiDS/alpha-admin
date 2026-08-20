import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.bodyMeasurement.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany({ where: { role: "MEMBER" } });

  const members = await Promise.all([
    prisma.user.create({
      data: {
        name: "Aisha Rahman",
        email: "aisha.rahman@example.com",
        role: "MEMBER",
        weightKg: 62.4,
        heightCm: 168,
        paymentStatus: "PAID",
        planExpiresAt: daysFromNow(42),
        planNotes: null,
        measurements: {
          create: [
            { weightKg: 64.1, heightCm: 168, recordedAt: daysFromNow(-60) },
            { weightKg: 62.4, heightCm: 168, recordedAt: daysFromNow(-7) },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Marcus Chen",
        email: "marcus.chen@example.com",
        role: "MEMBER",
        weightKg: 81.2,
        heightCm: 178,
        paymentStatus: "PAID",
        planExpiresAt: daysFromNow(5),
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Nair",
        email: "priya.nair@example.com",
        role: "MEMBER",
        weightKg: 58,
        heightCm: 160,
        paymentStatus: "OVERDUE",
        planExpiresAt: daysFromNow(-12),
        planNotes: "Followed up on 12 Aug about renewal.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Jonah Blake",
        email: "jonah.blake@example.com",
        role: "MEMBER",
        weightKg: 90.5,
        heightCm: 185,
        paymentStatus: "UNPAID",
        planExpiresAt: null,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sofia Alvarez",
        email: "sofia.alvarez@example.com",
        role: "MEMBER",
        weightKg: 70.1,
        heightCm: 172,
        paymentStatus: "PAID",
        planExpiresAt: daysFromNow(3),
      },
    }),
    prisma.user.create({
      data: {
        name: "Dev Patel",
        email: "dev.patel@example.com",
        role: "MEMBER",
        weightKg: 75,
        heightCm: 175,
        paymentStatus: "PAID",
        planExpiresAt: daysFromNow(90),
      },
    }),
  ]);

  const staff =
    (await prisma.user.findFirst({ where: { role: "ADMIN" } })) ??
    (await prisma.user.create({
      data: {
        name: "Gym Admin",
        email: "admin@example.com",
        role: "ADMIN",
        paymentStatus: "PAID",
      },
    }));

  await prisma.announcement.create({
    data: {
      title: "Holiday hours next week",
      body: "The gym closes at 6pm Monday–Wednesday for equipment servicing. Morning classes run as usual.",
      startsAt: daysFromNow(-1),
      endsAt: daysFromNow(10),
      createdById: staff.id,
    },
  });

  console.log(`Seeded ${members.length} members and 1 announcement.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
