import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("CLAWBUDDY_WEBHOOK_SECRET")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const COLUMN_MAP: Record<string, string> = {
  to_do: "todo",
  doing: "doing",
  needs_input: "needsInput",
  done: "done",
  canceled: "canceled",
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 400) {
  return ok({ error: message }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const incomingSecret = req.headers.get("x-webhook-secret");
  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return fail("Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  if (!body?.request_type || !body?.action) {
    return fail("Missing request_type or action", 400);
  }

  if (body.request_type === "task") {
    if (body.action === "list") {
      const column = body.column ? COLUMN_MAP[String(body.column).toLowerCase()] : null;
      let query = supabase.from("tasks").select("*").order("sort_order", { ascending: true });
      if (column) query = query.eq("status", column);
      const { data, error } = await query;
      if (error) return fail(error.message, 500);
      return ok({ tasks: data ?? [] });
    }

    if (body.action === "get") {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", body.task_id).single();
      if (error) return fail(error.message, 500);
      return ok({ task: data });
    }

    if (body.action === "create") {
      const row = {
        title: body.title,
        description: body.description ?? null,
        agent: body.agent_emoji || body.agent_name || "🤖",
        priority: body.priority,
        status: COLUMN_MAP[String(body.column || "to_do").toLowerCase()] || "todo",
        progress: null,
      };
      const { data, error } = await supabase.from("tasks").insert(row).select("*").single();
      if (error) return fail(error.message, 500);
      return ok({ task: data }, 201);
    }

    if (body.action === "update") {
      const patch: Record<string, unknown> = {};
      if (body.title != null) patch.title = body.title;
      if (body.priority != null) patch.priority = body.priority;
      if (body.description != null) patch.description = body.description;
      if (body.column != null) patch.status = COLUMN_MAP[String(body.column).toLowerCase()] || body.column;
      const { data, error } = await supabase.from("tasks").update(patch).eq("id", body.task_id).select("*").single();
      if (error) return fail(error.message, 500);
      return ok({ task: data });
    }

    if (body.action === "delete") {
      const { error } = await supabase.from("tasks").delete().eq("id", body.task_id);
      if (error) return fail(error.message, 500);
      return ok({ ok: true });
    }
  }

  if (body.request_type === "assignee") {
    if (body.action === "assign") {
      const rows = (body.names || []).map((name: string) => ({ task_id: body.task_id, name }));
      const { data, error } = await supabase.from("task_assignees").upsert(rows, { onConflict: "task_id,name" }).select("*");
      if (error) return fail(error.message, 500);
      return ok({ assignees: data ?? [] });
    }

    if (body.action === "unassign") {
      const names = body.names || [];
      let query = supabase.from("task_assignees").delete().eq("task_id", body.task_id);
      if (names.length) query = query.in("name", names);
      const { error } = await query;
      if (error) return fail(error.message, 500);
      return ok({ ok: true });
    }

    if (body.action === "list") {
      const { data, error } = await supabase.from("task_assignees").select("*").eq("task_id", body.task_id);
      if (error) return fail(error.message, 500);
      return ok({ assignees: data ?? [] });
    }
  }

  if (body.request_type === "subtask") {
    if (body.action === "create") {
      const { data, error } = await supabase.from("task_subtasks").insert({ task_id: body.task_id, title: body.title, completed: !!body.completed }).select("*").single();
      if (error) return fail(error.message, 500);
      return ok({ subtask: data }, 201);
    }

    if (body.action === "update") {
      const { data, error } = await supabase.from("task_subtasks").update({ completed: !!body.completed, title: body.title }).eq("id", body.subtask_id).select("*").single();
      if (error) return fail(error.message, 500);
      return ok({ subtask: data });
    }

    if (body.action === "delete") {
      const { error } = await supabase.from("task_subtasks").delete().eq("id", body.subtask_id);
      if (error) return fail(error.message, 500);
      return ok({ ok: true });
    }
  }

  if (body.request_type === "question") {
    if (body.action === "ask") {
      const { data, error } = await supabase.from("task_questions").insert({
        related_task_id: body.related_task_id ?? null,
        question_type: body.question_type ?? "question",
        priority: body.priority ?? "Medium",
        question: body.question,
        agent_name: body.agent_name ?? null,
        agent_emoji: body.agent_emoji ?? null,
      }).select("*").single();
      if (error) return fail(error.message, 500);
      return ok({ question: data }, 201);
    }
  }

  return fail("Unsupported request", 400);
});
