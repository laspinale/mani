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

const BOARD_COLUMN_NAME_MAP: Record<string, string> = {
  todo: "To Do",
  doing: "Doing",
  needsInput: "Needs Input",
  done: "Done",
  canceled: "Canceled",
};

function toApiColumn(status?: string | null, boardColumnName?: string | null) {
  if (boardColumnName === "To Do") return "to_do";
  if (boardColumnName === "Needs Input") return "needs_input";
  if (boardColumnName === "Doing") return "doing";
  if (boardColumnName === "Done") return "done";
  if (boardColumnName === "Canceled") return "canceled";
  if (status === "todo") return "to_do";
  if (status === "needsInput") return "needs_input";
  return status ?? "to_do";
}

function normalizeTask(task: Record<string, unknown>) {
  const boardColumn = task.board_columns as { name?: string | null; color?: string | null; position?: number | null } | null;
  return {
    ...task,
    column: toApiColumn(task.status as string | null, boardColumn?.name ?? null),
    board_column_name: boardColumn?.name ?? null,
    board_column_color: boardColumn?.color ?? null,
    board_column_position: boardColumn?.position ?? null,
    assignees: Array.isArray(task.task_assignees_v2)
      ? task.task_assignees_v2
      : Array.isArray(task.task_assignees)
        ? (task.task_assignees as Array<Record<string, unknown>>).map((item) => ({
            id: item.id,
            task_id: item.task_id,
            user_id: null,
            display_name: item.name,
            created_at: item.created_at,
          }))
        : [],
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : Array.isArray(task.task_subtasks) ? task.task_subtasks : [],
    due_date: task.due_date ?? null,
    position: task.position ?? task.sort_order ?? 0,
    created_by_bujji: task.created_by_bujji ?? false,
  };
}

async function getBoardColumnId(status: string) {
  const boardColumnName = BOARD_COLUMN_NAME_MAP[status] ?? BOARD_COLUMN_NAME_MAP.todo;
  const { data, error } = await supabase.from("board_columns").select("id").eq("name", boardColumnName).single();
  if (error) throw error;
  return data.id as string;
}

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
      let query = supabase
        .from("tasks")
        .select("*, board_columns(name,color,position), subtasks(*), task_subtasks(*), task_assignees(*), task_assignees_v2(*)")
        .order("position", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true });
      if (column) query = query.eq("status", column);
      const { data, error } = await query;
      if (error) return fail(error.message, 500);
      return ok({ tasks: (data ?? []).map((task) => normalizeTask(task as Record<string, unknown>)) });
    }

    if (body.action === "get") {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, board_columns(name,color,position), subtasks(*), task_subtasks(*), task_assignees(*), task_assignees_v2(*)")
        .eq("id", body.task_id)
        .single();
      if (error) return fail(error.message, 500);
      return ok({ task: normalizeTask((data ?? {}) as Record<string, unknown>) });
    }

    if (body.action === "create") {
      const status = COLUMN_MAP[String(body.column || "to_do").toLowerCase()] || "todo";
      let boardColumnId: string | null = null;
      try {
        boardColumnId = await getBoardColumnId(status);
      } catch (_) {
        boardColumnId = null;
      }
      const row = {
        title: body.title,
        description: body.description ?? null,
        agent: body.agent_emoji || body.agent_name || "🤖",
        priority: String(body.priority || "Medium").toLowerCase(),
        status,
        board_column_id: boardColumnId,
        due_date: body.due_date ?? null,
        progress: null,
        position: body.position ?? 0,
        created_by_bujji: !!body.created_by_bujji,
      };
      const { data, error } = await supabase
        .from("tasks")
        .insert(row)
        .select("*, board_columns(name,color,position), subtasks(*), task_subtasks(*), task_assignees(*), task_assignees_v2(*)")
        .single();
      if (error) return fail(error.message, 500);
      return ok({ task: normalizeTask((data ?? {}) as Record<string, unknown>) }, 201);
    }

    if (body.action === "update") {
      const patch: Record<string, unknown> = {};
      if (body.title != null) patch.title = body.title;
      if (body.priority != null) patch.priority = String(body.priority).toLowerCase();
      if (body.description != null) patch.description = body.description;
      if (body.due_date !== undefined) patch.due_date = body.due_date;
      if (body.position !== undefined) patch.position = body.position;
      if (body.created_by_bujji !== undefined) patch.created_by_bujji = !!body.created_by_bujji;
      if (body.column != null) {
        const status = COLUMN_MAP[String(body.column).toLowerCase()] || body.column;
        patch.status = status;
        try {
          patch.board_column_id = await getBoardColumnId(String(status));
        } catch (_) {
          patch.board_column_id = null;
        }
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", body.task_id)
        .select("*, board_columns(name,color,position), subtasks(*), task_subtasks(*), task_assignees(*), task_assignees_v2(*)")
        .single();
      if (error) return fail(error.message, 500);
      return ok({ task: normalizeTask((data ?? {}) as Record<string, unknown>) });
    }

    if (body.action === "delete") {
      const { error } = await supabase.from("tasks").delete().eq("id", body.task_id);
      if (error) return fail(error.message, 500);
      return ok({ ok: true });
    }
  }

  if (body.request_type === "assignee") {
    if (body.action === "assign") {
      const rows = (body.names || []).map((name: string) => ({ task_id: body.task_id, display_name: name }));
      let { data, error } = await supabase.from("task_assignees_v2").upsert(rows, { onConflict: "task_id,display_name" }).select("*");
      if (error) {
        const fallback = await supabase.from("task_assignees").upsert((body.names || []).map((name: string) => ({ task_id: body.task_id, name })), { onConflict: "task_id,name" }).select("*");
        if (fallback.error) return fail(fallback.error.message, 500);
        return ok({ assignees: (fallback.data ?? []).map((item) => ({ ...item, display_name: item.name, user_id: null })) });
      }
      return ok({ assignees: data ?? [] });
    }

    if (body.action === "unassign") {
      const names = body.names || [];
      let query = supabase.from("task_assignees_v2").delete().eq("task_id", body.task_id);
      if (names.length) query = query.in("display_name", names);
      let { error } = await query;
      if (error) {
        let fallbackQuery = supabase.from("task_assignees").delete().eq("task_id", body.task_id);
        if (names.length) fallbackQuery = fallbackQuery.in("name", names);
        const fallback = await fallbackQuery;
        if (fallback.error) return fail(fallback.error.message, 500);
      }
      return ok({ ok: true });
    }

    if (body.action === "list") {
      let { data, error } = await supabase.from("task_assignees_v2").select("*").eq("task_id", body.task_id);
      if (error) {
        const fallback = await supabase.from("task_assignees").select("*").eq("task_id", body.task_id);
        if (fallback.error) return fail(fallback.error.message, 500);
        return ok({ assignees: (fallback.data ?? []).map((item) => ({ ...item, display_name: item.name, user_id: null })) });
      }
      return ok({ assignees: data ?? [] });
    }
  }

  if (body.request_type === "subtask") {
    if (body.action === "create") {
      let { data, error } = await supabase.from("subtasks").insert({ task_id: body.task_id, title: body.title, completed: !!body.completed }).select("*").single();
      if (error) {
        const fallback = await supabase.from("task_subtasks").insert({ task_id: body.task_id, title: body.title, completed: !!body.completed }).select("*").single();
        if (fallback.error) return fail(fallback.error.message, 500);
        return ok({ subtask: fallback.data }, 201);
      }
      return ok({ subtask: data }, 201);
    }

    if (body.action === "update") {
      let { data, error } = await supabase.from("subtasks").update({ completed: !!body.completed, title: body.title }).eq("id", body.subtask_id).select("*").single();
      if (error) {
        const fallback = await supabase.from("task_subtasks").update({ completed: !!body.completed, title: body.title }).eq("id", body.subtask_id).select("*").single();
        if (fallback.error) return fail(fallback.error.message, 500);
        return ok({ subtask: fallback.data });
      }
      return ok({ subtask: data });
    }

    if (body.action === "delete") {
      let { error } = await supabase.from("subtasks").delete().eq("id", body.subtask_id);
      if (error) {
        const fallback = await supabase.from("task_subtasks").delete().eq("id", body.subtask_id);
        if (fallback.error) return fail(fallback.error.message, 500);
      }
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
