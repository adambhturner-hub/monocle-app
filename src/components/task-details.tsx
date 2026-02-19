'use client';

import { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Repeat, Clock, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, RecurrenceInterval } from '@/types';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

interface TaskDetailsProps {
    task: Task;
}

export function TaskDetails({ task }: TaskDetailsProps) {
    const { updateTask } = useMonocleStore();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const handleDateSelect = (date: Date | undefined) => {
        updateTask(task.id, { dueDate: date ? date.getTime() : undefined });
        setIsCalendarOpen(false);
    };

    const handleRecurrenceSelect = (value: string) => {
        const recurrence = value === 'none' ? undefined : (value as RecurrenceInterval);
        updateTask(task.id, { recurrence });
    };

    const handlePrioritySelect = (value: string) => {
        updateTask(task.id, { priority: value as 'low' | 'medium' | 'high' });
    };

    return (
        <div className="flex gap-2">

            {/* Due Date */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("text-xs h-8 gap-1", task.dueDate && "text-primary bg-primary/10")}>
                        <CalendarIcon className="h-3 w-3" />
                        {task.dueDate ? format(task.dueDate, 'MMM d') : 'Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={task.dueDate ? new Date(task.dueDate) : undefined}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {/* Recurrence & More */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("text-xs h-8 gap-1 px-2", task.recurrence && "text-primary bg-primary/10")}>
                        {task.recurrence ? <Repeat className="h-3 w-3" /> : <MoreHorizontal className="h-3 w-3" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Task Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Repeat className="mr-2 h-4 w-4" />
                            Recurrence
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={task.recurrence ? String(task.recurrence) : 'none'} onValueChange={handleRecurrenceSelect}>
                                <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="daily">Daily</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="weekly">Weekly</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Clock className="mr-2 h-4 w-4" />
                            Priority
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={task.priority} onValueChange={handlePrioritySelect}>
                                <DropdownMenuRadioItem value="low" className="text-blue-500">Low</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="high" className="text-red-500">High</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                </DropdownMenuContent>
            </DropdownMenu>

        </div>
    );
}
