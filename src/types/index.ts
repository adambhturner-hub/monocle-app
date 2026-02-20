
export type Priority = 'low' | 'medium' | 'high';

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly' | number;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'done';
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  dueDate?: number;
  recurrence?: RecurrenceInterval;
  isDraft?: boolean;
  createdAt: number;
  archivedAt?: number;
  completedAt?: number;
  skippedUntil?: number;
  duration?: number; // minutes
  friction?: {
    skips: number;
    holds: number;
  };
  isFrog?: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';
export type SessionOutcome = 'complete_task' | 'hold_task' | 'skip_task' | 'keep_working' | 'abandoned';

export interface FocusSession {
  id: string;
  taskId: string;
  projectId?: string;
  startTime: number;
  endTime?: number;
  durationScheduled: number; // minutes
  durationElapsed: number; // seconds
  status: SessionStatus;
  outcome?: SessionOutcome;
}
