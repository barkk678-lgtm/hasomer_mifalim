"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function transferBalance(mifalId: string, formData: FormData) {
  const supabase = createClient();
  const note = String(formData.get("note") ?? "") || undefined;

  const { error } = await supabase.rpc("transfer_mifal_balance", {
    p_mifal_id: mifalId,
    p_note: note,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/mifalim/${mifalId}/budget`);
  revalidatePath("/balances");
}
