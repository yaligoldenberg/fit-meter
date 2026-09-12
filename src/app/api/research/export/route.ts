import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isResearcher } from "@/lib/research";

/**
 * Researcher-only CSV export, one table per request, for analysis in SPSS/R.
 *
 * `?table=` selects which model to dump. The `users` export deliberately omits
 * `passwordHash` and `email` — participants stay identifiable by id/username, but
 * the file never carries credentials.
 */

const TABLES = ["users", "workouts", "friendships", "events"] as const;
type Table = (typeof TABLES)[number];

function isTable(value: string | null): value is Table {
  return !!value && (TABLES as readonly string[]).includes(value);
}

/**
 * Spreadsheets evaluate a field beginning with =, +, - or @ as a formula, so a
 * participant's workout note becomes executable the moment a researcher opens the CSV.
 * Prefixing an apostrophe forces Excel and Sheets to treat it as text.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Quotes a field only when needed, doubling embedded quotes — RFC 4180-style CSV escaping. */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const s = neutralizeFormula(raw);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

async function fetchTable(table: Table): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  switch (table) {
    case "users": {
      const columns = ["id", "username", "displayName", "gender", "locale", "condition", "createdAt"];
      const rows = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          gender: true,
          locale: true,
          condition: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return { columns, rows: rows as unknown as Record<string, unknown>[] };
    }
    case "workouts": {
      const columns = ["id", "userId", "type", "duration", "intensity", "distanceKm", "note", "date", "createdAt"];
      const rows = await prisma.workout.findMany({
        select: {
          id: true,
          userId: true,
          type: true,
          duration: true,
          intensity: true,
          distanceKm: true,
          note: true,
          date: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return { columns, rows: rows as unknown as Record<string, unknown>[] };
    }
    case "friendships": {
      const columns = ["id", "requesterId", "addresseeId", "status", "createdAt"];
      const rows = await prisma.friendship.findMany({
        select: { id: true, requesterId: true, addresseeId: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      return { columns, rows: rows as unknown as Record<string, unknown>[] };
    }
    case "events": {
      const columns = ["id", "userId", "type", "meta", "createdAt"];
      const rows = await prisma.event.findMany({
        select: { id: true, userId: true, type: true, meta: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      return { columns, rows: rows as unknown as Record<string, unknown>[] };
    }
  }
}

export async function GET(req: NextRequest) {
  // 404, not 401 — a researcher-only endpoint shouldn't announce its own existence.
  if (!isResearcher(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tableParam = new URL(req.url).searchParams.get("table");
  if (!isTable(tableParam)) {
    return NextResponse.json(
      { error: `Invalid or missing ?table= — expected one of: ${TABLES.join(", ")}` },
      { status: 400 }
    );
  }

  const { columns, rows } = await fetchTable(tableParam);
  const csv = toCsv(rows, columns);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fitmeter_${tableParam}.csv"`,
    },
  });
}
