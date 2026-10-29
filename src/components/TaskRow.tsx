import { useStore } from "../lib/store";
import { openDependencies, taskDisplayStatus } from "../lib/calc";
import type { Task } from "../lib/types";
import { DateCell, Pill, StatusBadge } from "./ui";
import { shortUni } from "./forms";

export function TaskRow({ task, onEdit, compact }: { task: Task; onEdit?: (t: Task) => void; compact?: boolean }) {
  const { state, patch } = useStore();
  const ds = taskDisplayStatus(task, state.tasks);
  const blockers = openDependencies(task, state.tasks);
  const done = task.status === "complete";
  return (
    <li className={`task-row${done ? " is-done" : ""}`}>
      <input
        type="checkbox"
        id={`chk-${task.id}`}
        checked={done}
        aria-label={done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}
        onChange={(e) => patch("tasks", task.id, { status: e.target.checked ? "complete" : "in_progress" })}
      />
      <div className="task-main">
        <button type="button" className="task-title linklike" onClick={() => onEdit?.(task)} disabled={!onEdit}>
          {task.title}
        </button>
        <div className="task-meta">
          <StatusBadge status={ds} small />
          <Pill tone={task.priority === "high" ? "bad" : task.priority === "medium" ? "warn" : "neutral"}>{task.priority}</Pill>
          {!compact &&
            task.programIds.map((p) => (
              <Pill key={p} tone="info">
                {shortUni(state, p)}
              </Pill>
            ))}
          {blockers.length > 0 && !done && (
            <span className="small muted">
              Waiting on: {blockers.map((b) => b.title).slice(0, 2).join("; ")}
              {blockers.length > 2 ? "…" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="task-date">
        <DateCell date={task.deadline} done={done} />
      </div>
    </li>
  );
}
