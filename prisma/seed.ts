import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function birthday(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.bodyMeasurement.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.planEligibility.deleteMany();
  await prisma.user.deleteMany({ where: { role: "MEMBER" } });
  await prisma.membershipPlan.deleteMany();

  const standardPlan = await prisma.membershipPlan.create({
    data: {
      name: "Standard monthly",
      description: "Default plan every new member starts on.",
      priceInPaise: 150_000,
      durationDays: 30,
      isDefault: true,
    },
  });

  const newJoinerPlan = await prisma.membershipPlan.create({
    data: {
      name: "New joiner – 3 months",
      description: "Discounted quarterly plan for members who joined this month.",
      priceInPaise: 350_000,
      durationDays: 90,
      isRestricted: true,
    },
  });

  await prisma.membershipPlan.create({
    data: {
      name: "Legacy annual",
      description: "Grandfathered pricing for long-standing members.",
      priceInPaise: 1_200_000,
      durationDays: 365,
      isRestricted: true,
    },
  });

  const members = await Promise.all([
    prisma.user.create({
      data: {
        name: "Aisha Rahman",
        email: "aisha.rahman@example.com",
        role: "MEMBER",
        phone: "+91 98400 11223",
        dateOfBirth: birthday(1994, 3, 12),
        gender: "FEMALE",
        emergencyContact: "Imran Rahman +91 98400 11224",
        fitnessGoal: "Marathon training",
        joinSource: "QR",
        profileCompletedAt: daysFromNow(-70),
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
        phone: "+91 90030 55112",
        dateOfBirth: birthday(1988, 11, 2),
        gender: "MALE",
        fitnessGoal: "Strength",
        profileCompletedAt: daysFromNow(-30),
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
        phone: "+91 99620 74410",
        dateOfBirth: birthday(1999, 7, 24),
        gender: "FEMALE",
        joinSource: "QR",
        profileCompletedAt: daysFromNow(-120),
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

  await prisma.user.updateMany({
    where: { role: "MEMBER", planId: null },
    data: { planId: standardPlan.id },
  });

  // Newest sign-ups get access to the discounted quarterly plan.
  const newJoiners = members.slice(-2);
  await prisma.planEligibility.createMany({
    data: newJoiners.map((member) => ({
      userId: member.id,
      planId: newJoinerPlan.id,
    })),
    skipDuplicates: true,
  });

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

  console.log(
    `Seeded ${members.length} members, 3 plans, and 1 announcement.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
