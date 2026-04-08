
export type Priority = 'low' | 'medium' | 'high';

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly' | number;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'done' | 'waiting';
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  launchDate?: number;
  recurrence?: RecurrenceInterval;
  attachments?: string[];
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
  isBlocked?: boolean;
  isFrog?: boolean;
  isAvoidedFrog?: boolean;
  avoidedAt?: number;
  isLightning?: boolean;
  isOngoing?: boolean;
  updatedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon?: string;
  excludeFromQueue?: boolean;
  updatedAt?: number;
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
  totalPausedMs: number;
  lastPausedAt?: number;
  status: SessionStatus;
  outcome?: SessionOutcome;
  updatedAt?: number;
}

export interface Habit {
    id: string;
    title: string;
    streak: number;
    lastCompletedAt?: number; // Unix timestamp for determining rollover and streaks
    createdAt: number;
    icon?: string;
    color?: string;
    daysOfWeek?: number[]; // [0-6] where 0 is Sunday. If undefined, assume daily.
}

export interface TimeBlock {
    id: string;
    date: number; // Midnight timestamp for the intended day
    startTime: number; // Minutes since midnight (e.g., 540 = 9:00 AM)
    duration: number; // Minutes
    title: string;
    taskId?: string; // If this links directly to an existing Monocle Task
    color?: string; // Optional UI hex override
    updatedAt?: number;
}
