import { prisma } from "./db";
import { scoreWindow, trailingWindow, ScorableWorkout, WindowScoreResult } from "./scoring";

export interface LeaderboardPerson {
  id: string;
  username: string;
  displayName: string;
  gender: string | null;
}

export const PERSON_FIELDS = { id: true, username: true, displayName: true, gender: true } as const;

export type RankedPerson<P extends LeaderboardPerson> = P & WindowScoreResult & { rank: number };

/**
 * Scores and orders people for one window. The single source of the board's ordering:
 * the leaderboard API and the morning push both rank through here, so the name in the
 * notification is always the name on top of the board it opens.
 */
export async function rankPeople<P extends LeaderboardPerson>(
  people: P[],
  window: { start: Date; end: Date }
): Promise<RankedPerson<P>[]> {
  const ids = people.map((p) => p.id);

  // One query for everyone's workouts in the window instead of one per person — with the
  // DB in a different region, a per-person round trip adds up fast on a big group.
  const allWorkouts = ids.length
    ? await prisma.workout.findMany({
        where: { userId: { in: ids }, date: { gte: window.start, lt: window.end } },
      })
    : [];

  const workoutsByUser = new Map<string, ScorableWorkout[]>();
  for (const w of allWorkouts) {
    const list = workoutsByUser.get(w.userId);
    if (list) list.push(w);
    else workoutsByUser.set(w.userId, [w]);
  }

  const results = people.map((person) => ({
    ...person,
    ...scoreWindow(workoutsByUser.get(person.id) ?? []),
  }));

  // Name breaks the tie so the zero-score tail (long on the everyone board) is stable
  // between reloads instead of reshuffling with query order.
  results.sort(
    (a, b) => b.score - a.score || b.effort - a.effort || a.displayName.localeCompare(b.displayName)
  );
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The everyone board as it stands at `reference` — what /leaderboard shows by default. */
export async function rankEveryone(reference = new Date()) {
  const users = await prisma.user.findMany({ select: PERSON_FIELDS });
  return rankPeople(users, trailingWindow(reference));
}
