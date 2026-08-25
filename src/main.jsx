import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { format, isAfter, parseISO, subDays } from "date-fns";
import DOMPurify from "dompurify";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  MessageSquareMore,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Users,
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

const tasks = {
  todo: [
    { title: "Draft onboarding checklist", agent: "📋", priority: "medium" },
    { title: "Audit security logging", agent: "🛡️", priority: "high" },
    { title: "Create release summary", agent: "🤖", priority: "low" },
  ],
  doing: [
    { title: "Refactor task assignment flow", agent: "🤖", priority: "urgent", progress: 72 },
    { title: "Sync council transcript", agent: "📋", priority: "medium", progress: 44 },
  ],
  needsInput: [
    { title: "Clarify KPI target for Q3", agent: "📋", priority: "high" },
    { title: "Approve policy exception", agent: "🛡️", priority: "urgent" },
  ],
  done: [
    { title: "Ship dashboard metrics", agent: "🤖", priority: "low" },
    { title: "Summarize last meetings", agent: "🛡️", priority: "medium" },
    { title: "Rebalance task queue", agent: "📋", priority: "medium" },
  ],
};

function normalizeMeeting(meeting) {
  return {
    ...meeting,
    action_items: Array.isArray(meeting.action_items) ? meeting.action_items : [],
    attendees: Array.isArray(meeting.attendees) ? meeting.attendees : [],
    external_domains: Array.isArray(meeting.external_domains) ? meeting.external_domains : [],
  };
}

function App() {
  const [tab, setTab] = useState("deck");
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
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeetings() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("date", { ascending: false });

      if (cancelled) return;

      if (error || !Array.isArray(data) || data.length === 0) {
        setMeetings(mockMeetings);
        setMeetingsSource("mock");
        setSelectedMeeting(mockMeetings[0] || null);
        return;
      }

      const normalized = data.map(normalizeMeeting);
      setMeetings(normalized);
      setMeetingsSource("supabase");
      setSelectedMeeting(normalized[0] || null);
    }

    loadMeetings();

    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [search, hasActionItems, externalOnly, selectedTypes, dateRange]);

  const pieData = useMemo(() => {
    const data = [
      { name: "1-on-1", value: 2 },
      { name: "external", value: 2 },
      { name: "sales", value: 2 },
      { name: "team", value: 1 },
      { name: "standup", value: 2 },
      { name: "planning", value: 1 },
      { name: "interview", value: 1 },
      { name: "allhands", value: 1 },
    ];
    return data;
  }, []);

  const barData = useMemo(() => {
    const months = {};
    meetings.forEach((m) => {
      const key = format(parseISO(m.date), "MMM");
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }, []);

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
  }, [search, hasActionItems, externalOnly, selectedTypes, dateRange, sortBy]);

  const categories = ["all", "observation", "general", "reminder", "fyi"];

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
            <strong>{agents[0].name}: Online</strong>
            <div>{agents[0].activity}</div>
          </div>
          <div className="muted">Last seen: {agents[0].lastSeen}</div>
        </div>
      </header>

      <nav className="tab-row glass-card">
        {[
          ["deck", "Command Deck"],
          ["agents", "Agents"],
          ["board", "Task Board"],
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
            <motion.section key="board" className="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {Object.entries(tasks).map(([column, items]) => (
                <div key={column} className="glass-card column" onDragOver={(e) => e.preventDefault()} onDrop={() => setDragging(null)}>
                  <PanelTitle title={columnLabel(column)} subtitle={`${items.length} cards`} />
                  <div className="task-list">
                    {items.map((task) => (
                      <div key={task.title} draggable className={`task-card ${dragging === task.title ? "dragging" : ""}`} onDragStart={() => setDragging(task.title)} onDragEnd={() => setDragging(null)}>
                        <div className="task-top">
                          <strong>{task.title}</strong>
                          <span className={`priority ${task.priority}`}>{task.priority}</span>
                        </div>
                        <div className="task-bottom">
                          <span className="emoji">{task.agent}</span>
                          {task.progress != null && <span className="muted">{task.progress}% complete</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
    todo: "To Do",
    doing: "Doing",
    needsInput: "Needs Input",
    done: "Done",
  }[value];
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
