"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type WorkoutImportRow = {
  scheduled_date: string;
  title: string;
  sport: string;
  duration_minutes: number | null;
  intensity: string | null;
  source: "manual";
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
};

async function getUserId() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect("/training-plan?status=demo");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

export async function addManualWorkoutAction(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "");
  const sport = String(formData.get("sport") ?? "");

  if (!date || !title || !sport) {
    redirect("/training-plan?status=missing");
  }

  await supabase.from("planned_workouts").insert({
    user_id: userId,
    scheduled_date: date,
    title,
    sport,
    duration_minutes: Number(formData.get("duration_minutes")) || null,
    intensity: String(formData.get("intensity") ?? "") || null,
    source: "manual",
  });

  revalidatePath("/");
  redirect("/training-plan?status=added");
}

export async function importPlanCsvAction(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const csv = String(formData.get("csv") ?? "").trim();

  if (!csv) {
    redirect("/training-plan?status=missing");
  }

  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const [headerLine, ...bodyLines] = rows;
  const headers = parseCsvLine(headerLine).map((header) => header.toLowerCase());
  const requiredHeaders = ["date", "title", "sport"];

  if (!requiredHeaders.every((header) => headers.includes(header))) {
    redirect("/training-plan?status=columns");
  }

  const importedRows: WorkoutImportRow[] = bodyLines
    .map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

      return {
        scheduled_date: row.date,
        title: row.title,
        sport: row.sport,
        duration_minutes: Number(row.duration_minutes) || null,
        intensity: row.intensity || null,
        source: "manual" as const,
      };
    })
    .filter((row) => row.scheduled_date && row.title && row.sport);

  if (importedRows.length === 0) {
    redirect("/training-plan?status=empty");
  }

  await supabase.from("planned_workouts").insert(
    importedRows.map((row) => ({
      ...row,
      user_id: userId,
    })),
  );

  revalidatePath("/");
  redirect(`/training-plan?status=imported&count=${importedRows.length}`);
}
