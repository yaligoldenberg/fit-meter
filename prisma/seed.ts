import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const WORKOUT_TYPES = ["RUNNING", "CYCLING", "SWIMMING", "WALKING", "STRENGTH", "HIIT", "YOGA", "SPORT"];
const INTENSITIES = ["LOW", "MEDIUM", "HIGH"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(daysAgoMax: number): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * daysAgoMax);
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(Math.floor(Math.random() * 12) + 6, 0, 0, 0);
  return d;
}

const DEMO_USERS = [
  { email: "dana@example.com", username: "danak", displayName: "Dana Keller", activity: "high" as const },
  { email: "marco@example.com", username: "marcot", displayName: "Marco Torres", activity: "medium" as const },
  { email: "priya@example.com", username: "priyar", displayName: "Priya Rao", activity: "low" as const },
  { email: "sam@example.com", username: "samwise", displayName: "Sam Wise", activity: "medium" as const },
];

const WORKOUTS_PER_WEEK: Record<"high" | "medium" | "low", number> = {
  high: 6,
  medium: 4,
  low: 2,
};

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const createdUsers = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        passwordHash: password,
      },
    });
    createdUsers.push({ ...user, activity: u.activity });
  }

  // 3 weeks of history per demo user
  for (const user of createdUsers) {
    const count = WORKOUTS_PER_WEEK[user.activity] * 3;
    const existing = await prisma.workout.count({ where: { userId: user.id } });
    if (existing > 0) continue;
    for (let i = 0; i < count; i++) {
      await prisma.workout.create({
        data: {
          userId: user.id,
          type: pick(WORKOUT_TYPES),
          duration: 20 + Math.floor(Math.random() * 60),
          intensity: pick(INTENSITIES),
          distanceKm: Math.random() > 0.5 ? Math.round(Math.random() * 12 * 10) / 10 : null,
          date: randDate(21),
        },
      });
    }
  }

  // Friend everyone with everyone (accepted) so any demo login sees a full leaderboard.
  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = i + 1; j < createdUsers.length; j++) {
      const a = createdUsers[i];
      const b = createdUsers[j];
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: a.id, addresseeId: b.id },
            { requesterId: b.id, addresseeId: a.id },
          ],
        },
      });
      if (!existing) {
        await prisma.friendship.create({
          data: { requesterId: a.id, addresseeId: b.id, status: "ACCEPTED" },
        });
      }
    }
  }

  console.log("Seeded demo users (password: password123):");
  for (const u of DEMO_USERS) console.log(`  - ${u.username} / ${u.email}`);
  console.log("\nSign up with your own account, then add one of these usernames as a friend to see the leaderboard.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
