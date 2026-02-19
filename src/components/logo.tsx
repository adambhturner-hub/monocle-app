import { Circle } from "lucide-react";

export function Logo({ className = "", showSlogan = true }: { className?: string, showSlogan?: boolean }) {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="flex items-center gap-2 relative">
                {/* Monocle Icon */}
                <div className="relative">
                    <Circle className="h-10 w-10 text-foreground stroke-[2.5px]" />
                    {/* Glint */}
                    <div className="absolute top-2 left-2 w-3 h-2 border-t-2 border-l-2 border-foreground rounded-tl-full opacity-60" />
                    {/* Monocle Handle/Underline - simplified as an underline for the whole logo or just the icon? 
                        The image shows a line under the 'o' or the icon. Let's do a small line under the icon. */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-full" />
                </div>

                {/* Text */}
                <span className="text-4xl font-bold tracking-tight text-foreground relative top-[-2px]">
                    Monocle
                </span>
            </div>

            {/* Slogan */}
            {showSlogan && (
                <div className="flex items-center gap-3 mt-1 w-full justify-center opacity-60">
                    <div className="h-[1px] bg-border flex-1" />
                    <span className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground whitespace-nowrap">
                        One Task At A Time
                    </span>
                    <div className="h-[1px] bg-border flex-1" />
                </div>
            )}
        </div>
    );
}

// Small version for headers/corners
export function LogoSmall({ className = "", showText = true }: { className?: string, showText?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <Circle className="h-6 w-6 text-foreground stroke-2" />
                <div className="absolute top-1 left-1 w-2 h-1.5 border-t border-l border-foreground rounded-tl-full opacity-60" />
            </div>
            {showText && <span className="text-lg font-bold tracking-tight">Monocle</span>}
        </div>
    );
}
