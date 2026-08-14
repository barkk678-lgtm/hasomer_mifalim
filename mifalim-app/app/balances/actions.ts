"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addGeneralExpense(formData: FormData) {
  const supabase = createClient();

  const expense_name = String(formData.get("expense_name") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const occurred_at = String(formData.get("occurred_at") ?? "");
  const notes = String(formData.get("notes") ?? "") || null;

  const { error } = await supabase.from("expenses").insert([
    {
      owner_type: "general",
      owner_id: null,
      expense_name,
      quantity: 1,
      unit_price: amount,
      occurred_at: new Date(occurred_at).toISOString(),
      notes,
    },
  ]);

  if (error) throw new Error(error.message);

  revalidatePath("/balances");
}

export async function addGeneralIncome(formData: FormData) {
  const supabase = createClient();

  const source_name = String(formData.get("source_name") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const occurred_at = String(formData.get("occurred_at") ?? "");

  const { error } = await supabase.from("external_income").insert([
    {
      owner_type: "general",
      owner_id: null,
      source_name,
      amount,
      occurred_at: new Date(occurred_at).toISOString(),
    },
  ]);

  if (error) throw new Error(error.message);

  revalidatePath("/balances");
}
