import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Expense Categories (upsert — safe to re-run) ────────────
  const defaultCategories = [
    { name: "Rent", emoji: "🏢", description: "Gym building rent" },
    { name: "Electricity", emoji: "⚡", description: "EB bill, generator" },
    { name: "Water", emoji: "💧", description: "Water bill" },
    { name: "Salaries", emoji: "👥", description: "Trainers, receptionist, cleaner" },
    { name: "Internet & Phone", emoji: "📱", description: "Wi-Fi, mobile" },
    { name: "Cleaning", emoji: "🧹", description: "Cleaning materials/service" },
    { name: "Equipment", emoji: "🏋️", description: "Repairs, maintenance" },
    { name: "Maintenance", emoji: "🔧", description: "AC, plumbing, electrical" },
    { name: "Marketing", emoji: "📣", description: "Instagram, Google Ads, banners" },
    { name: "Gym Supplies", emoji: "🥤", description: "Water, towels, tissues" },
    { name: "Software", emoji: "💻", description: "Gym software, subscriptions" },
    { name: "Loan/EMI", emoji: "🏦", description: "Equipment/building loan" },
    { name: "Taxes & Fees", emoji: "🧾", description: "GST, licenses, CA fees" },
    { name: "Insurance", emoji: "🛡️", description: "Gym/property insurance" },
    { name: "Other", emoji: "📦", description: "Anything else" },
  ];

  for (const cat of defaultCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isDefault: true },
    });
  }

  console.log(`Seeded ${defaultCategories.length} expense categories.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
