import React from 'react';
import { cn } from '@/lib/utils';


export interface MentionOption {
    label: string;
    value: string;
    icon?: React.ReactNode;
    meta?: string; // extra info like "Due: Tmr"
}

interface MentionsListProps {
    options: MentionOption[];
    onSelect: (option: MentionOption) => void;
    position?: { top?: number; bottom?: number; left?: number }; // To be refined
    className?: string;
    selectedIndex: number;
}

export function MentionsList({ options, onSelect, selectedIndex, className }: MentionsListProps) {
    if (options.length === 0) return null;

    return (
        <div className={cn(
            "absolute z-50 w-64 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
            className
        )}>
            <div className="p-1">
                {options.map((opt, idx) => (
                    <div
                        key={opt.value}
                        className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            idx === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => onSelect(opt)}
                    >
                        {opt.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{opt.icon}</span>}
                        <span>{opt.label}</span>
                        {opt.meta && <span className="ml-auto text-xs text-muted-foreground">{opt.meta}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
