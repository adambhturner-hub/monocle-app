import { Circle } from "lucide-react";

export function Logo({ className = "", showSlogan = true }: { className?: string, showSlogan?: boolean }) {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="flex items-center gap-3 relative">
                {/* Monocle Icon */}
                <div className="relative flex flex-col items-center w-10 h-10 mt-auto">
                    <div className="w-[85%] h-[85%] rounded-full border-[3px] border-foreground flex items-start justify-start p-[15%] relative">
                        {/* Glint */}
                        <div className="w-[50%] h-[50%] border-t-[2px] border-l-[2px] border-foreground rounded-tl-full opacity-60" />
                    </div>
                    {/* Handle */}
                    <div className="absolute -bottom-1 w-[50%] h-[2px] bg-foreground rounded-full" />
                </div>

                {/* Text */}
                <span className="text-4xl font-black tracking-tighter text-foreground relative top-[-1px]">
                    Monocle.
                </span>
            </div>

            {/* Slogan */}
            {showSlogan && (
                <div className="flex items-center gap-3 mt-1 w-full justify-center opacity-60">
                    <span className="text-[12px] tracking-wide font-medium text-foreground whitespace-nowrap">
                        The fancy focus app.
                    </span>
                </div>
            )}
        </div>
    );
}

// Small version for headers/corners
export function LogoSmall({ className = "", showText = true }: { className?: string, showText?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex flex-col items-center w-6 h-6 mt-0.5">
                <div className="w-[85%] h-[85%] rounded-full border-2 border-foreground flex items-start justify-start p-[15%] relative">
                    <div className="w-[50%] h-[50%] border-t border-l border-foreground rounded-tl-full opacity-60" />
                </div>
                <div className="absolute -bottom-[3px] w-[50%] h-[1.5px] bg-foreground rounded-full" />
            </div>
            {showText && <span className="text-lg font-bold tracking-tight">Monocle.</span>}
        </div>
    );
}
