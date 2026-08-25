import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { format, formatDistanceToNow, isAfter, isBefore, parseISO, subDays } from "date-fns";
import DOMPurify from "dompurify";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock,
  Globe,
  MessageSquareMore,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
  Wand2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";
import { supabase } from "./lib/supabase";

const CLAWBUDDY_API_URL = import.meta.env.DEV ? "/api/ai-tasks" : `${import.meta.env.VITE_CLAWBUDDY_API_URL}/functions/v1/ai-tasks`;
const DEFAULT_AGENT_NAME = import.meta.env.VITE_AGENT_NAME || "Agent Alpha";
const DEFAULT_AGENT_EMOJI = import.meta.env.VITE_AGENT_EMOJI || "🤖";

const agents = [
  { name: "Agent Alpha", emoji: "🤖", type: "Code Agent", role: "Lead Engineer", accent: "#10b981", status: "active", activity: "Refactoring task queue", lastSeen: "just now", tasksCompleted: 128, accuracy: 98.4, skills: ["TypeScript", "Architecture", "Reviews"] },
  { name: "Dispatch Bot", emoji: "📋", type: "Coordinator", role: "Operations Director", accent: "#f59e0b", status: "idle", activity: "Waiting on next dispatch", lastSeen: "3m ago", tasksCompleted: 84, accuracy: 94.8, skills: ["Scheduling", "Routing", "Planning"] },
  { name: "Audit Bot", emoji: "🛡️", type: "Quality Agent", role: "Compliance Officer", accent: "#06b6d4", status: "active", activity: "Reviewing log anomalies", lastSeen: "just now", tasksCompleted: 212, accuracy: 99.2, skills: ["QA", "Policy", "Reporting"] },
];

const activityFeed = [
  { emoji: "🤖", text: "Agent Alpha merged a patch into the command deck.", time: "2m ago" },
  { emoji: "📋", text: "Dispatch Bot redistributed 4 tasks after a priority shift.", time: "6m ago" },
  { emoji: "🛡️", text: "Audit Bot flagged one task for missing acceptance criteria.", time: "11m ago" },
  { emoji: "🤖", text: "Agent Alpha completed code review cycle #18.", time: "18m ago" },
  { emoji: "📋", text: "Dispatch Bot created a new council session for planning.", time: "27m ago" },
];

const logs = [
  { category: "observation", agent: "Audit Bot", text: "Detected 2 duplicate task titles in the backlog.", time: "1m ago" },
  { category: "general", agent: "Agent Alpha", text: "Context window stable after queue compaction.", time: "4m ago" },
  { category: "reminder", agent: "Dispatch Bot", text: "Need human input on blocked integration spec.", time: "9m ago" },
  { category: "fyi", agent: "Audit Bot", text: "Weekly report export completed successfully.", time: "14m ago" },
  { category: "observation", agent: "Agent Alpha", text: "Build metrics improved by 7% after optimization.", time: "23m ago" },
  { category: "general", agent: "Dispatch Bot", text: "Rebalanced workstream load across active agents.", time: "31m ago" },
  { category: "reminder", agent: "Audit Bot", text: "Review unresolved high-priority items before EOD.", time: "42m ago" },
  { category: "fyi", agent: "Agent Alpha", text: "No regression detected in the latest iteration.", time: "55m ago" },
];

const councils = [
  {
    question: "Should we prioritize reliability or throughput for the next sprint?",
    status: "In Debate",
    participants: [
      { name: "Agent Alpha", emoji: "🤖", sent: 3, limit: 5, status: "speaking" },
      { name: "Dispatch Bot", emoji: "📋", sent: 2, limit: 4, status: "listening" },
      { name: "Audit Bot", emoji: "🛡️", sent: 3, limit: 4, status: "speaking" },
    ],
    messages: [
      { emoji: "🤖", name: "Agent Alpha", num: 1, text: "Reliability protects compounding velocity; we'd rather ship fewer defects.", time: "3m ago" },
      { emoji: "📋", name: "Dispatch Bot", num: 2, text: "Throughput matters if we want the queue to keep breathing.", time: "2m ago" },
      { emoji: "🛡️", name: "Audit Bot", num: 3, text: "The strongest path is lower variance with targeted throughput gains.", time: "1m ago" },
    ],
  },
  {
    question: "Which workflow should be automated next?",
    status: "Pending Vote",
    participants: [
      { name: "Agent Alpha", emoji: "🤖", sent: 1, limit: 4, status: "listening" },
      { name: "Dispatch Bot", emoji: "📋", sent: 2, limit: 4, status: "speaking" },
      { name: "Audit Bot", emoji: "🛡️", sent: 1, limit: 3, status: "listening" },
    ],
    messages: [
      { emoji: "📋", name: "Dispatch Bot", num: 1, text: "Automate routing of repetitive tasks first.", time: "8m ago" },
      { emoji: "🤖", name: "Agent Alpha", num: 2, text: "Agree, but add guardrails before scaling the automation.", time: "6m ago" },
      { emoji: "🛡️", name: "Audit Bot", num: 3, text: "Include an audit trail from the start.", time: "4m ago" },
    ],
  },
];

const integrationGuide = {
  overview: [
    "Use the Kanban API as the system of record for task lifecycle updates.",
    "Treat meetings as a separate Supabase-backed domain until they get their own API facade.",
    "Keep auth and agent identity distinct from task payloads so agents can self-register cleanly.",
  ],
  endpoints: [
    { requestType: "task", actions: ["list", "get", "create", "update", "delete"] },
    { requestType: "assignee", actions: ["list", "assign", "unassign"] },
    { requestType: "subtask", actions: ["create", "update", "delete"] },
    { requestType: "question", actions: ["ask"] },
  ],
  rules: [
    "Columns use the API contract: to_do, doing, needs_input, done, canceled.",
    "Priorities use: Low, Medium, High, Urgent.",
    "Agents should send agent_name and agent_emoji with task mutations.",
    "Use the webhook-protected API path in development via /api/ai-tasks.",
  ],
  nextDocs: [
    "Document agent self-registration flow against the agents table.",
    "Add payload examples for task updates, assignee updates, and blocking questions.",
    "Explain how humans and agents are represented in-platform.",
  ],
};

const meetingTypes = {
  standup: "#818cf8",
  "1-on-1": "#60a5fa",
  external: "#a78bfa",
  sales: "#34d399",
  team: "#fb923c",
  planning: "#2dd4bf",
  interview: "#f43f5e",
  allhands: "#22c55e",
};

const mockMeetings = [
  { type: "meeting", title: "Weekly Standup with Engineering", date: "2026-02-25T10:00:00Z", duration_minutes: 30, duration_display: "30m", attendees: ["Alice", "Bob", "Charlie"], summary: "Discussed sprint progress. Backend API 80% complete.", action_items: [{ task: "Review PR #42", assignee: "Alice", done: false }, { task: "Update docs", assignee: "Bob", done: true }], ai_insights: "30 minute standup with 3 attendees.", meeting_type: "standup", sentiment: "positive", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Customer Expansion Call", date: "2026-02-24T15:00:00Z", duration_minutes: 45, duration_display: "45m", attendees: ["Mia", "Jordan", "Nina"], summary: "Reviewed renewal path and implementation milestones.", action_items: [{ task: "Send proposal revision", assignee: "Mia", done: false }], ai_insights: "High intent external sales call.", meeting_type: "sales", sentiment: "positive", has_external_participants: true, external_domains: ["acme.com"], fathom_url: null, share_url: null },
  { type: "meeting", title: "Product Planning Session", date: "2026-02-20T09:00:00Z", duration_minutes: 60, duration_display: "1h", attendees: ["Sam", "Taylor", "Riley", "Jordan"], summary: "Outlined Q2 goals, dependencies, and launch sequencing.", action_items: [{ task: "Finalize scope", assignee: "Taylor", done: false }, { task: "Draft timeline", assignee: "Sam", done: false }], ai_insights: "Planning session with multiple owners.", meeting_type: "planning", sentiment: "neutral", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Founder 1:1", date: "2026-02-18T13:00:00Z", duration_minutes: 30, duration_display: "30m", attendees: ["Alex", "Founder"], summary: "Covered priorities, team shape, and hiring gaps.", action_items: [{ task: "Share hiring plan", assignee: "Alex", done: false }], ai_insights: "Focused decision-making and alignment.", meeting_type: "1-on-1", sentiment: "positive", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Candidate Interview", date: "2026-02-16T17:00:00Z", duration_minutes: 50, duration_display: "50m", attendees: ["Priya", "Interviewer", "Panel"], summary: "Evaluated systems design depth and collaboration style.", action_items: [{ task: "Compile feedback", assignee: "Panel", done: false }], ai_insights: "Strong technical signal, moderate communication variance.", meeting_type: "interview", sentiment: "neutral", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "All-Hands Q1 Review", date: "2026-02-14T18:00:00Z", duration_minutes: 75, duration_display: "1h 15m", attendees: ["Team"], summary: "Shared company metrics, roadmap, and wins.", action_items: [{ task: "Publish recording notes", assignee: "Ops", done: true }], ai_insights: "Company-wide alignment session.", meeting_type: "allhands", sentiment: "positive", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Design Review with Client", date: "2026-02-12T14:30:00Z", duration_minutes: 40, duration_display: "40m", attendees: ["Elena", "Client", "Design"], summary: "Reviewed wireframes and revision requests.", action_items: [{ task: "Update hero section", assignee: "Design", done: false }], ai_insights: "External stakeholders requested a tighter scope.", meeting_type: "external", sentiment: "neutral", has_external_participants: true, external_domains: ["clientstudio.io"], fathom_url: null, share_url: null },
  { type: "meeting", title: "1:1 with Engineering Lead", date: "2026-02-10T11:00:00Z", duration_minutes: 25, duration_display: "25m", attendees: ["Lee", "Morgan"], summary: "Discussed performance, mentorship, and career growth.", action_items: [{ task: "Share feedback notes", assignee: "Lee", done: true }], ai_insights: "Healthy manager-reporting cadence.", meeting_type: "1-on-1", sentiment: "positive", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Sales Demo: Northwind", date: "2026-02-09T16:00:00Z", duration_minutes: 35, duration_display: "35m", attendees: ["Sales", "Northwind"], summary: "Demoed onboarding and summarized rollout steps.", action_items: [{ task: "Send security packet", assignee: "Sales", done: false }], ai_insights: "External sales conversation with strong engagement.", meeting_type: "sales", sentiment: "positive", has_external_participants: true, external_domains: ["northwind.com"], fathom_url: null, share_url: null },
  { type: "meeting", title: "Weekly Team Sync", date: "2026-02-07T10:30:00Z", duration_minutes: 45, duration_display: "45m", attendees: ["Team", "Ops", "Product"], summary: "Reviewed blockers, escalation paths, and delivery risk.", action_items: [{ task: "Resolve dependency blocker", assignee: "Ops", done: false }], ai_insights: "Routine cross-functional sync.", meeting_type: "team", sentiment: "neutral", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
  { type: "meeting", title: "Standup: Platform", date: "2026-02-05T09:30:00Z", duration_minutes: 15, duration_display: "15m", attendees: ["Platform", "Infra", "QA"], summary: "Quick update on deployment status and alerts.", action_items: [{ task: "Investigate alert spike", assignee: "QA", done: false }], ai_insights: "Short operational check-in.", meeting_type: "standup", sentiment: "neutral", has_external_participants: false, external_domains: [], fathom_url: null, share_url: null },
];

const mockTasks = {
  to_do: [
    { title: "Draft onboarding checklist", agent: "📋", priority: "Medium", status: "to_do" },
    { title: "Audit security logging", agent: "🛡️", priority: "High", status: "to_do" },
    { title: "Create release summary", agent: "🤖", priority: "Low", status: "to_do" },
  ],
  doing: [
    { title: "Refactor task assignment flow", agent: "🤖", priority: "Urgent", progress: 72, status: "doing" },
    { title: "Sync council transcript", agent: "📋", priority: "Medium", progress: 44, status: "doing" },
  ],
  needs_input: [
    { title: "Clarify KPI target for Q3", agent: "📋", priority: "High", status: "needs_input" },
    { title: "Approve policy exception", agent: "🛡️", priority: "Urgent", status: "needs_input" },
  ],
  done: [
    { title: "Ship dashboard metrics", agent: "🤖", priority: "Low", status: "done" },
    { title: "Summarize last meetings", agent: "🛡️", priority: "Medium", status: "done" },
    { title: "Rebalance task queue", agent: "📋", priority: "Medium", status: "done" },
  ],
  canceled: [],
};

const KANBAN_COLUMNS = [
  { key: "to_do", name: "To Do", color: "#ef4444" },
  { key: "doing", name: "Doing", color: "#f59e0b" },
  { key: "needs_input", name: "Needs Input", color: "#8b5cf6" },
  { key: "done", name: "Done", color: "#10b981" },
  { key: "canceled", name: "Canceled", color: "#6b7280" },
];

const emptyTaskColumns = KANBAN_COLUMNS.reduce((acc, column) => {
  acc[column.key] = [];
  return acc;
}, {});

async function callClawBuddyApi(body) {
  if (!CLAWBUDDY_API_URL) {
    throw new Error("Missing ClawBuddy API configuration");
  }

  const response = await fetch(CLAWBUDDY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_name: DEFAULT_AGENT_NAME,
      agent_emoji: DEFAULT_AGENT_EMOJI,
      ...body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `ClawBuddy API error ${response.status}`);
  }

  return response.json();
}

function toBoardColumn(status) {
  if (status === "todo") return "to_do";
  if (status === "needsInput") return "needs_input";
  return status;
}

function normalizeTaskRecord(task) {
  const status = toBoardColumn(task.column || task.status);
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasks.filter((item) => item.completed).length;
  return {
    ...task,
    id: task.id,
    title: task.title,
    description: task.description,
    agent: task.agent || task.agent_name || DEFAULT_AGENT_EMOJI,
    priority: task.priority ? `${task.priority}`.replace(/^./, (c) => c.toUpperCase()) : task.priority,
    status,
    progress: task.progress ?? null,
    due_date: task.due_date ?? null,
    assignees,
    subtasks,
    completedSubtasks,
    boardColor: task.board_column_color || KANBAN_COLUMNS.find((column) => column.key === status)?.color,
    boardName: task.board_column_name || columnLabel(status),
    position: task.position ?? task.sort_order ?? 0,
  };
}

function normalizeTasks(rows) {
  return rows.reduce((acc, task) => {
    const normalized = normalizeTaskRecord(task);
    if (!acc[normalized.status]) acc[normalized.status] = [];
    acc[normalized.status].push(normalized);
    return acc;
  }, { ...emptyTaskColumns });
}

function normalizeMeeting(meeting) {
  return {
    ...meeting,
    action_items: Array.isArray(meeting.action_items) ? meeting.action_items : [],
    attendees: Array.isArray(meeting.attendees) ? meeting.attendees : [],
    external_domains: Array.isArray(meeting.external_domains) ? meeting.external_domains : [],
  };
}

function App() {
  const [tab, setTab] = useState("meetings");
  const [logFilter, setLogFilter] = useState("all");
  const [expandedCouncil, setExpandedCouncil] = useState(0);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [hasActionItems, setHasActionItems] = useState(false);
  const [externalOnly, setExternalOnly] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(["standup", "sales", "1-on-1", "planning", "team", "external", "interview", "allhands"]);
  const [sortBy, setSortBy] = useState("recent");
  const [meetings, setMeetings] = useState(mockMeetings);
  const [meetingsSource, setMeetingsSource] = useState("mock");
  const [selectedMeeting, setSelectedMeeting] = useState(mockMeetings[0] || null);
  const [tasks, setTasks] = useState(mockTasks);
  const [tasksSource, setTasksSource] = useState("mock");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [dragging, setDragging] = useState(null);
  const [mobileBoardTab, setMobileBoardTab] = useState("to_do");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const meetingsPromise = supabase
        ? supabase.from("meetings").select("*").order("date", { ascending: false })
        : Promise.resolve({ data: null, error: new Error("Supabase unavailable") });

      const tasksPromise = callClawBuddyApi({ request_type: "task", action: "list" }).catch((error) => ({ error }));

      const [meetingsRes, tasksRes] = await Promise.all([meetingsPromise, tasksPromise]);

      if (cancelled) return;

      const { data: meetingsData, error: meetingsError } = meetingsRes;
      if (meetingsError || !Array.isArray(meetingsData) || meetingsData.length === 0) {
        setMeetings(mockMeetings);
        setMeetingsSource("mock");
        setSelectedMeeting(mockMeetings[0] || null);
      } else {
        const normalizedMeetings = meetingsData.map(normalizeMeeting);
        setMeetings(normalizedMeetings);
        setMeetingsSource("supabase");
        setSelectedMeeting(normalizedMeetings[0] || null);
      }

      const tasksData = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : Array.isArray(tasksRes?.data) ? tasksRes.data : null;
      if (!tasksData || tasksRes?.error) {
        setTasks(mockTasks);
        setTasksSource("mock");
      } else {
        setTasks(normalizeTasks(tasksData));
        setTasksSource("api");
      }
    }

    loadData();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const taskTables = ["tasks", "subtasks", "task_subtasks", "task_assignees", "task_assignees_v2"];
    const channels = taskTables.map((table) =>
      supabase
        .channel(`board-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, async () => {
          if (!cancelled) await refreshTasks();
        })
        .subscribe()
    );

    return () => {
      cancelled = true;
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  async function refreshTasks() {
    try {
      const tasksRes = await callClawBuddyApi({ request_type: "task", action: "list" });
      const tasksData = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : Array.isArray(tasksRes?.data) ? tasksRes.data : null;
      if (!tasksData) throw new Error("No task data returned");
      setTasks(normalizeTasks(tasksData));
      setTasksSource("api");
    } catch (error) {
      console.error(error);
      setTasks(mockTasks);
      setTasksSource("mock");
    }
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;
    await callClawBuddyApi({
      request_type: "task",
      action: "create",
      title: newTaskTitle,
      description: newTaskDescription,
      column: "to_do",
      priority: newTaskPriority,
    });
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("Medium");
    await refreshTasks();
  }

  async function moveTask(taskId, column) {
    const ordered = tasks[column] || [];
    await callClawBuddyApi({
      request_type: "task",
      action: "update",
      task_id: taskId,
      column,
      position: ordered.length + 1,
    });
    await refreshTasks();
  }

  async function assignTask(taskId, names = [DEFAULT_AGENT_NAME]) {
    await callClawBuddyApi({
      request_type: "assignee",
      action: "assign",
      task_id: taskId,
      names,
    });
    await refreshTasks();
  }

  async function unassignTask(taskId, name) {
    await callClawBuddyApi({
      request_type: "assignee",
      action: "unassign",
      task_id: taskId,
      names: [name],
    });
    await refreshTasks();
  }

  async function saveTaskDraft() {
    if (!taskDraft?.id) return;
    await callClawBuddyApi({
      request_type: "task",
      action: "update",
      task_id: taskDraft.id,
      title: taskDraft.title,
      description: taskDraft.description,
      priority: taskDraft.priority,
      column: taskDraft.status,
      due_date: taskDraft.due_date || null,
    });
    await refreshTasks();
  }

  async function deleteTask(taskId) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    await callClawBuddyApi({ request_type: "task", action: "delete", task_id: taskId });
    setSelectedTaskId(null);
    setTaskDraft(null);
    await refreshTasks();
  }

  async function addSubtask() {
    if (!selectedTaskId || !newSubtaskTitle.trim()) return;
    await callClawBuddyApi({
      request_type: "subtask",
      action: "create",
      task_id: selectedTaskId,
      title: newSubtaskTitle,
      completed: false,
    });
    setNewSubtaskTitle("");
    await refreshTasks();
  }

  async function toggleSubtask(subtask) {
    await callClawBuddyApi({
      request_type: "subtask",
      action: "update",
      subtask_id: subtask.id,
      title: subtask.title,
      completed: !subtask.completed,
    });
    await refreshTasks();
  }

  async function deleteSubtask(subtaskId) {
    await callClawBuddyApi({
      request_type: "subtask",
      action: "delete",
      subtask_id: subtaskId,
    });
    await refreshTasks();
  }

  const counts = useMemo(() => {
    const filtered = meetings.filter((m) => {
      const okSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const okAction = !hasActionItems || m.action_items.some((a) => !a.done);
      const okExternal = !externalOnly || m.has_external_participants;
      const okType = selectedTypes.includes(m.meeting_type);
      const cutoff = dateRange === "7d" ? subDays(new Date("2026-02-25T00:00:00Z"), 7) : dateRange === "30d" ? subDays(new Date("2026-02-25T00:00:00Z"), 30) : dateRange === "90d" ? subDays(new Date("2026-02-25T00:00:00Z"), 90) : null;
      const okDate = !cutoff || isAfter(parseISO(m.date), cutoff);
      return okSearch && okAction && okExternal && okType && okDate;
    });
    return {
      meetings: filtered.length,
      week: filtered.filter((m) => isAfter(parseISO(m.date), subDays(new Date("2026-02-25T00:00:00Z"), 7))).length,
      openItems: filtered.reduce((sum, m) => sum + m.action_items.filter((a) => !a.done).length, 0),
      avgDuration: filtered.length ? Math.round(filtered.reduce((sum, m) => sum + m.duration_minutes, 0) / filtered.length) : 0,
    };
  }, [meetings, search, hasActionItems, externalOnly, selectedTypes, dateRange]);

  const pieData = useMemo(() => {
    const countsByType = meetings.reduce((acc, meeting) => {
      acc[meeting.meeting_type] = (acc[meeting.meeting_type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(countsByType).map(([name, value]) => ({ name, value }));
  }, [meetings]);

  const barData = useMemo(() => {
    const months = {};
    meetings.forEach((m) => {
      const key = format(parseISO(m.date), "MMM");
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    return [...meetings]
      .filter((m) => {
        const okSearch = m.title.toLowerCase().includes(search.toLowerCase());
        const okAction = !hasActionItems || m.action_items.some((a) => !a.done);
        const okExternal = !externalOnly || m.has_external_participants;
        const okType = selectedTypes.includes(m.meeting_type);
        const cutoff = dateRange === "7d" ? subDays(new Date("2026-02-25T00:00:00Z"), 7) : dateRange === "30d" ? subDays(new Date("2026-02-25T00:00:00Z"), 30) : dateRange === "90d" ? subDays(new Date("2026-02-25T00:00:00Z"), 90) : null;
        const okDate = !cutoff || isAfter(parseISO(m.date), cutoff);
        return okSearch && okAction && okExternal && okType && okDate;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
        if (sortBy === "longest") return b.duration_minutes - a.duration_minutes;
        return new Date(b.date) - new Date(a.date);
      });
  }, [meetings, search, hasActionItems, externalOnly, selectedTypes, dateRange, sortBy]);

  const categories = ["all", "observation", "general", "reminder", "fyi"];

  const boardTaskCount = useMemo(() => Object.values(tasks).reduce((sum, items) => sum + items.length, 0), [tasks]);
  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks]);
  const selectedTask = useMemo(() => allTasks.find((task) => task.id === selectedTaskId) || null, [allTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskDraft(null);
      return;
    }
    setTaskDraft({
      id: selectedTask.id,
      title: selectedTask.title || "",
      description: selectedTask.description || "",
      priority: selectedTask.priority || "Medium",
      status: selectedTask.status || "to_do",
      due_date: selectedTask.due_date || "",
    });
  }, [selectedTask]);

  return (
    <div className="app-shell">
      <div className="aurora" />
      <header className="glass-card header">
        <div>
          <div className="brand-row">
            <span className="paw">🐾</span>
            <div>
              <h1>ClawBuddy</h1>
              <p>AI Agent Command Center</p>
            </div>
          </div>
        </div>
        <div className="agent-status">
          <span className="status-dot active" />
          <span className="pill">Meetings: {meetingsSource}</span>
          <div>
            <strong>Meetings backend: {meetingsSource === "supabase" ? "Supabase" : "Mock fallback"}</strong>
            <div>{meetingsSource === "supabase" ? "Live meetings loaded from remote data" : "Using local fallback meetings data"}</div>
          </div>
          <div className="muted">Rows loaded: {meetings.length}</div>
        </div>
      </header>

      <nav className="tab-row glass-card">
        {[
          ["deck", "Command Deck"],
          ["agents", "Agents"],
          ["board", "Task Board"],
          ["guide", "Integration Guide"],
          ["log", "AI Log"],
          ["council", "Council"],
          ["meetings", "Meetings"],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main className="content">
        <AnimatePresence mode="wait">
          {tab === "deck" && (
            <motion.section key="deck" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stack">
              <section className="metric-grid">
                {[{ label: "Active Agents", icon: Users, value: 3 }, { label: "Tasks in Flight", icon: Activity, value: 12 }, { label: "Open Alerts", icon: MessageSquareMore, value: 4 }, { label: "Council Threads", icon: Wand2, value: 2 }].map((item, index) => (
                  <MetricCard key={item.label} {...item} delay={index * 0.05} />
                ))}
              </section>

              <section className="deck-grid">
                <div className="glass-card panel">
                  <PanelTitle icon={Activity} title="Recent Activity" subtitle="Latest events across the fleet" />
                  <div className="activity-list">
                    {activityFeed.map((item, i) => (
                      <motion.div key={item.text} className="activity-item" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <span className="emoji">{item.emoji}</span>
                        <div>
                          <div>{item.text}</div>
                          <span className="muted">{item.time}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="glass-card panel">
                  <PanelTitle icon={Users} title="Agent Status" subtitle="Live operational view" />
                  <div className="agent-cards">
                    {agents.map((a) => (
                      <div key={a.name} className="agent-mini">
                        <span className={`status-dot ${a.status}`} />
                        <div>
                          <strong>{a.name}</strong>
                          <div className="muted">{a.activity}</div>
                        </div>
                        <div className="muted">{a.lastSeen}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.section>
          )}

          {tab === "agents" && (
            <motion.section key="agents" className="grid-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {agents.map((a) => (
                <div key={a.name} className="glass-card agent-profile">
                  <div className="agent-head">
                    <div className="emoji large">{a.emoji}</div>
                    <div>
                      <h3>{a.name}</h3>
                      <p className="muted">{a.type} · {a.role}</p>
                    </div>
                    <span className={`pill status ${a.status}`}>{a.status}</span>
                  </div>
                  <div className="stats-row">
                    <div><span>Tasks</span><strong>{a.tasksCompleted}</strong></div>
                    <div><span>Accuracy</span><strong>{a.accuracy}%</strong></div>
                    <div><span>Accent</span><strong style={{ color: a.accent }}>{a.accent}</strong></div>
                  </div>
                  <div className="skill-row">
                    {a.skills.map((s) => <span key={s} className="chip">{s}</span>)}
                  </div>
                  <button className="secondary-btn">View Details</button>
                </div>
              ))}
            </motion.section>
          )}

          {tab === "board" && (
            <motion.section key="board" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className="glass-card board-shell">
                <div className="board-header-row">
                  <div>
                    <p className="eyebrow">Workspace</p>
                    <h2 className="board-title">Board</h2>
                    <p className="muted">Full task flow powered by {tasksSource === "api" ? "the ClawBuddy API" : "mock fallback data"} · {boardTaskCount} tasks</p>
                  </div>
                  <button className="primary-btn" onClick={createTask}>
                    <Plus size={16} />
                    <span>+ New Task</span>
                  </button>
                </div>

                <div className="board-composer">
                  <input className="select board-input" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
                  <input className="select board-input" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Short description" />
                  <select className="select board-select" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="board-mobile-tabs">
                  {KANBAN_COLUMNS.map((column) => (
                    <button
                      key={column.key}
                      className={`board-mobile-tab ${mobileBoardTab === column.key ? "active" : ""}`}
                      onClick={() => setMobileBoardTab(column.key)}
                    >
                      {column.name}
                    </button>
                  ))}
                </div>

                <motion.section className="kanban kanban-phase-two" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {KANBAN_COLUMNS.map((column) => {
                    const items = tasks[column.key] || [];
                    return (
                      <div
                        key={column.key}
                        className={`glass-card board-column ${mobileBoardTab === column.key ? "mobile-active" : ""}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async () => {
                          if (dragging) {
                            await moveTask(dragging, column.key);
                            setDragging(null);
                          }
                        }}
                      >
                        <div className="board-column-topbar" style={{ background: column.color }} />
                        <div className="board-column-header">
                          <div className="board-column-title-wrap" style={{ borderLeftColor: column.color }}>
                            <h3>{column.name}</h3>
                            <p className="muted">{column.key === "needs_input" ? "Waiting on human input" : column.key === "doing" ? "Currently in motion" : column.key === "done" ? "Completed work" : column.key === "canceled" ? "Intentionally stopped" : "Ready to pick up"}</p>
                          </div>
                          <span className="count-badge">{items.length}</span>
                        </div>
                        <div className="board-column-body">
                          {items.length === 0 ? (
                            <div className="empty-column">
                              <CircleUserRound size={18} />
                              <span>No tasks</span>
                            </div>
                          ) : (
                            items
                              .slice()
                              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                              .map((task) => (
                                <button
                                  key={task.id || task.title}
                                  draggable
                                  type="button"
                                  className={`task-card kanban-task-card ${dragging === (task.id || task.title) ? "dragging" : ""}`}
                                  onDragStart={() => setDragging(task.id || task.title)}
                                  onDragEnd={() => setDragging(null)}
                                  onClick={() => setSelectedTaskId(task.id)}
                                  aria-label={`Open task ${task.title}`}
                                >
                                  <div className="task-card-head">
                                    <strong className="task-card-title">{task.title}</strong>
                                    <span className={`priority-badge ${String(task.priority || "").toLowerCase()}`}>{task.priority}</span>
                                  </div>

                                  {task.description ? <p className="task-description-preview">{task.description}</p> : null}

                                  <div className="task-meta-row">
                                    <AssigneeStack assignees={task.assignees} />
                                    <button
                                      className="inline-assign-btn"
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        assignTask(task.id);
                                      }}
                                    >
                                      Assign
                                    </button>
                                  </div>

                                  <div className="task-meta-row task-meta-bottom">
                                    <div className="task-due-wrap">
                                      {task.due_date ? <DueDate dueDate={task.due_date} /> : null}
                                    </div>
                                    {task.progress != null ? <span className="muted">{task.progress}% complete</span> : null}
                                  </div>

                                  {task.subtasks?.length ? (
                                    <div className="subtask-progress-wrap">
                                      <div className="subtask-progress-label">
                                        <span>{task.completedSubtasks}/{task.subtasks.length} subtasks</span>
                                      </div>
                                      <div className="subtask-progress-bar">
                                        <span style={{ width: `${Math.round((task.completedSubtasks / task.subtasks.length) * 100)}%` }} />
                                      </div>
                                    </div>
                                  ) : null}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.section>

                <AnimatePresence>
                  {selectedTask && taskDraft ? (
                    <motion.aside
                      className="task-drawer-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="glass-card task-drawer"
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 30, opacity: 0 }}
                      >
                        <div className="task-drawer-head">
                          <div>
                            <p className="eyebrow">Task detail</p>
                            <h3>{selectedTask.title}</h3>
                          </div>
                          <button className="icon-btn" type="button" onClick={() => setSelectedTaskId(null)}>
                            <X size={16} />
                          </button>
                        </div>

                        <div className="task-drawer-body">
                          <label className="drawer-field">
                            <span>Title</span>
                            <input className="select" value={taskDraft.title} onChange={(e) => setTaskDraft((current) => ({ ...current, title: e.target.value }))} />
                          </label>

                          <label className="drawer-field">
                            <span>Description</span>
                            <textarea className="select drawer-textarea" value={taskDraft.description} onChange={(e) => setTaskDraft((current) => ({ ...current, description: e.target.value }))} />
                          </label>

                          <div className="drawer-grid">
                            <label className="drawer-field">
                              <span>Priority</span>
                              <select className="select" value={taskDraft.priority} onChange={(e) => setTaskDraft((current) => ({ ...current, priority: e.target.value }))}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                              </select>
                            </label>

                            <label className="drawer-field">
                              <span>Column</span>
                              <select className="select" value={taskDraft.status} onChange={(e) => setTaskDraft((current) => ({ ...current, status: e.target.value }))}>
                                {KANBAN_COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.name}</option>)}
                              </select>
                            </label>

                            <label className="drawer-field">
                              <span>Due date</span>
                              <input className="select" type="date" value={taskDraft.due_date || ""} onChange={(e) => setTaskDraft((current) => ({ ...current, due_date: e.target.value }))} />
                            </label>
                          </div>

                          <div className="drawer-section">
                            <div className="drawer-section-head">
                              <h4>Assignees</h4>
                            </div>
                            <div className="assignee-chip-row">
                              {selectedTask.assignees?.length ? selectedTask.assignees.map((assignee) => {
                                const name = assignee.display_name || assignee.name;
                                return (
                                  <button key={assignee.id || name} className="assignee-pill" type="button" onClick={() => unassignTask(selectedTask.id, name)}>
                                    {name} <X size={12} />
                                  </button>
                                );
                              }) : <span className="muted">No assignees yet</span>}
                            </div>
                            <div className="drawer-inline-form">
                              <input className="select" value={newAssigneeName} onChange={(e) => setNewAssigneeName(e.target.value)} placeholder="Add assignee by name" />
                              <button
                                className="secondary-btn"
                                type="button"
                                onClick={async () => {
                                  if (!newAssigneeName.trim()) return;
                                  await assignTask(selectedTask.id, [newAssigneeName.trim()]);
                                  setNewAssigneeName("");
                                }}
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          <div className="drawer-section">
                            <div className="drawer-section-head">
                              <h4>Subtasks</h4>
                            </div>
                            <div className="subtask-list-drawer">
                              {selectedTask.subtasks?.length ? selectedTask.subtasks.map((subtask) => (
                                <label key={subtask.id} className="subtask-row">
                                  <input type="checkbox" checked={!!subtask.completed} onChange={() => toggleSubtask(subtask)} />
                                  <span>{subtask.title}</span>
                                  <button type="button" className="icon-btn subtle" onClick={() => deleteSubtask(subtask.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </label>
                              )) : <span className="muted">No subtasks yet</span>}
                            </div>
                            <div className="drawer-inline-form">
                              <input className="select" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Add subtask" />
                              <button className="secondary-btn" type="button" onClick={addSubtask}>Add</button>
                            </div>
                          </div>

                          <div className="drawer-markdown-preview">
                            <h4>Description preview</h4>
                            <div className="summary" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(taskDraft.description ? `<p>${taskDraft.description.replace(/\n/g, "</p><p>")}</p>` : "<p>No description yet.</p>") }} />
                          </div>
                        </div>

                        <div className="task-drawer-actions">
                          <button className="secondary-btn" type="button" onClick={saveTaskDraft}>Save changes</button>
                          <button className="danger-btn" type="button" onClick={() => deleteTask(selectedTask.id)}>
                            <Trash2 size={14} /> Delete task
                          </button>
                        </div>
                      </motion.div>
                    </motion.aside>
                  ) : null}
                </AnimatePresence>
              </section>
            </motion.section>
          )}

          {tab === "guide" && (
            <motion.section key="guide" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className="glass-card panel guide-hero">
                <p className="eyebrow">Docs in progress</p>
                <h2 className="board-title">Integration Guide</h2>
                <p className="muted">Build the platform and its API contract side by side. This page is the in-app source of truth for how humans, agents, and Kanban mutations are expected to work.</p>
              </section>

              <section className="guide-grid">
                <div className="glass-card panel">
                  <PanelTitle title="Kanban API overview" subtitle="What agents should assume today" />
                  <div className="guide-list">
                    {integrationGuide.overview.map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>

                <div className="glass-card panel">
                  <PanelTitle title="Rules" subtitle="Stable contract decisions" />
                  <div className="guide-list">
                    {integrationGuide.rules.map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>
              </section>

              <section className="guide-grid guide-grid-2">
                <div className="glass-card panel">
                  <PanelTitle title="Endpoint map" subtitle="Current request types and actions" />
                  <div className="guide-endpoints">
                    {integrationGuide.endpoints.map((endpoint) => (
                      <div key={endpoint.requestType} className="guide-endpoint-card">
                        <strong>{endpoint.requestType}</strong>
                        <div className="chips">
                          {endpoint.actions.map((action) => <span key={action} className="chip">{action}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card panel">
                  <PanelTitle title="Next docs to write" subtitle="Parallel work queue" />
                  <div className="guide-list">
                    {integrationGuide.nextDocs.map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>
              </section>
            </motion.section>
          )}

          {tab === "log" && (
            <motion.section key="log" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card panel filter-row">
                <PanelTitle icon={MessageSquareMore} title="AI Log" subtitle="Chronological agent activity" />
                <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="select">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="glass-card panel">
                <div className="log-list">
                  {logs.filter((l) => logFilter === "all" || l.category === logFilter).map((l, i) => (
                    <motion.div key={i} className="log-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <span className={`badge ${l.category}`}>{l.category}</span>
                      <div>
                        <strong>{l.agent}</strong>
                        <p>{l.text}</p>
                      </div>
                      <span className="muted">{l.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {tab === "council" && (
            <motion.section key="council" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {councils.map((c, idx) => (
                <div key={c.question} className="glass-card council">
                  <button className="council-head" onClick={() => setExpandedCouncil(expandedCouncil === idx ? -1 : idx)}>
                    <div>
                      <h3>{c.question}</h3>
                      <div className="muted">{c.participants.length} participants</div>
                    </div>
                    <div className="status-row">
                      <span className="pill">{c.status}</span>
                      {expandedCouncil === idx ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </button>
                  <div className="chips">
                    {c.participants.map((p) => (
                      <span key={p.name} className="chip">
                        {p.emoji} {p.name} {p.sent}/{p.limit}
                      </span>
                    ))}
                  </div>
                  <AnimatePresence initial={false}>
                    {expandedCouncil === idx && (
                      <motion.div className="council-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        {c.messages.map((m, i) => (
                          <motion.div key={m.num} className="message" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <strong>{m.emoji} {m.name} #{m.num}</strong>
                            <p>{m.text}</p>
                            <span className="muted">{m.time}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.section>
          )}

          {tab === "meetings" && (
            <motion.section key="meetings" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className="metric-grid">
                <MetricCard icon={Calendar} label="Total Meetings" value={counts.meetings} />
                <MetricCard icon={TrendingUp} label="This Week" value={counts.week} />
                <MetricCard icon={CheckSquare} label="Open Action Items" value={counts.openItems} />
                <MetricCard icon={Clock} label="Avg Duration" value={`${counts.avgDuration}m`} />
              </section>

              <section className="charts-grid">
                <div className="glass-card panel chart-panel">
                  <PanelTitle title="Meeting Type Distribution" subtitle="Current mix by type" />
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {pieData.map((entry) => <Cell key={entry.name} fill={meetingTypes[entry.name]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card panel chart-panel">
                  <PanelTitle title="Monthly Trend" subtitle="Meeting volume over time" />
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="glass-card panel filters">
                <div className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meetings by title" />
                </div>
                <div className="filter-chips">
                  {Object.keys(meetingTypes).map((type) => (
                    <button key={type} className={`chip toggle ${selectedTypes.includes(type) ? "active" : ""}`} onClick={() => setSelectedTypes((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type])}>{type}</button>
                  ))}
                </div>
                <div className="filters-row">
                  <select className="select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                    <option value="90d">90d</option>
                    <option value="all">All</option>
                  </select>
                  <label className="toggle-row"><input type="checkbox" checked={hasActionItems} onChange={(e) => setHasActionItems(e.target.checked)} /> Has Action Items</label>
                  <label className="toggle-row"><input type="checkbox" checked={externalOnly} onChange={(e) => setExternalOnly(e.target.checked)} /> External Only</label>
                  <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="longest">Longest Duration</option>
                  </select>
                </div>
              </section>

              <section className="meeting-layout">
                <div className="glass-card panel meeting-list">
                  {filteredMeetings.map((meeting) => (
                    <button key={meeting.title} className={`meeting-card ${selectedMeeting?.title === meeting.title ? "active" : ""}`} onClick={() => setSelectedMeeting(meeting)}>
                      <div className="meeting-main">
                        <span className="pill" style={{ background: `${meetingTypes[meeting.meeting_type]}22`, color: meetingTypes[meeting.meeting_type] }}>{meeting.meeting_type}</span>
                        <strong>{meeting.title}</strong>
                        <div className="muted">{format(parseISO(meeting.date), "PPP p")} · {meeting.duration_display}</div>
                      </div>
                      <div className="meeting-meta">
                        <div className="avatars">
                          {meeting.attendees.slice(0, 3).map((a) => <span key={a} className="avatar">{a.slice(0, 1)}</span>)}
                          {meeting.attendees.length > 3 && <span className="avatar">+{meeting.attendees.length - 3}</span>}
                        </div>
                        <div className="meta-row">
                          {meeting.has_external_participants && <Globe size={14} />}
                          <span className="pill">{meeting.action_items.length} actions</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="glass-card panel meeting-detail">
                  <div className="detail-head">
                    <div>
                      <span className="pill" style={{ background: `${meetingTypes[selectedMeeting?.meeting_type] || "#10b981"}22`, color: meetingTypes[selectedMeeting?.meeting_type] || "#10b981" }}>{selectedMeeting?.meeting_type}</span>
                      <h3>{selectedMeeting?.title || "No meeting selected"}</h3>
                      <div className="muted">{selectedMeeting ? `${format(parseISO(selectedMeeting.date), "PPP p")} · ${selectedMeeting.duration_display}` : "No meeting data available"}</div>
                    </div>
                    <div className="detail-actions">
                      <button className="secondary-btn">Open Recording</button>
                      <button className="secondary-btn">Share Link</button>
                    </div>
                  </div>
                  <div className="summary" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${selectedMeeting?.summary || ""}</p><p><strong>Sentiment:</strong> ${selectedMeeting?.sentiment || "unknown"}</p>`) }} />
                  <div>
                    <h4>Action Items</h4>
                    <div className="action-items">
                      {selectedMeeting?.action_items?.map((item) => (
                        <label key={item.task} className="action-item">
                          <input type="checkbox" defaultChecked={item.done} />
                          <span>{item.task} · {item.assignee}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="insight">
                    <Sparkles size={16} /> {selectedMeeting?.ai_insights || "No AI insights available yet."}
                  </div>
                  <div>
                    <h4>Attendees</h4>
                    <div className="chips">{selectedMeeting?.attendees?.map((a) => <span className="chip" key={a}>{a}</span>)}</div>
                  </div>
                  <div className="footer-actions">
                    <label className="select-wrap">
                      <span>Send To...</span>
                      <select className="select">
                        <option>Action Items</option>
                        <option>Proposals</option>
                        <option>Lead Magnets</option>
                      </select>
                    </label>
                  </div>
                </div>
              </section>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, delay = 0 }) {
  return (
    <motion.div className="glass-card metric-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="metric-icon"><Icon size={18} /></div>
      <div className="muted">{label}</div>
      <strong>{value}</strong>
    </motion.div>
  );
}

function PanelTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="panel-title">
      <div>
        <h3>{title}</h3>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {Icon && <Icon size={18} className="panel-icon" />}
    </div>
  );
}

function columnLabel(value) {
  return {
    to_do: "To Do",
    doing: "Doing",
    needs_input: "Needs Input",
    done: "Done",
    canceled: "Canceled",
  }[value];
}

function DueDate({ dueDate }) {
  const parsed = parseISO(`${dueDate}T00:00:00`);
  const overdue = isBefore(parsed, new Date());
  return (
    <span className={`due-date ${overdue ? "overdue" : ""}`}>
      <Calendar size={14} />
      {formatDistanceToNow(parsed, { addSuffix: true })}
    </span>
  );
}

function AssigneeStack({ assignees }) {
  if (!assignees?.length) {
    return (
      <div className="assignee-stack empty">
        <span className="assignee-fallback"><CircleUserRound size={14} /></span>
      </div>
    );
  }

  const visible = assignees.slice(0, 3);
  const overflow = assignees.length - visible.length;

  return (
    <div className="assignee-stack">
      {visible.map((assignee) => {
        const label = assignee.display_name || assignee.name || "User";
        return (
          <span key={`${assignee.id || label}`} className="assignee-avatar" style={{ background: stringToColor(label) }}>
            {initials(label)}
          </span>
        );
      })}
      {overflow > 0 ? <span className="assignee-avatar overflow">+{overflow}</span> : null}
    </div>
  );
}

function initials(value) {
  return String(value)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function stringToColor(value) {
  const palette = ["#2563eb", "#7c3aed", "#db2777", "#0891b2", "#059669", "#ea580c"];
  const hash = String(value).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
