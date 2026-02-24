import { motion } from "framer-motion";

export function AnimatedLogo({ className = "" }: { className?: string }) {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="flex items-center gap-3 relative">
                {/* Monocle Icon Container - Spinning */}
                <motion.div
                    className="relative flex flex-col items-center w-12 h-12 mt-auto"
                    animate={{ rotate: 360 }}
                    transition={{
                        repeat: Infinity,
                        duration: 8,
                        ease: "linear"
                    }}
                >
                    {/* Glowing outer ring */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-foreground blur-md opacity-20"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "easeInOut"
                        }}
                    />
                    <div className="w-[85%] h-[85%] rounded-full border-[3px] border-foreground flex items-start justify-start p-[15%] relative z-10 bg-background mix-blend-normal">
                        {/* Glint */}
                        <div className="w-[50%] h-[50%] border-t-[2px] border-l-[2px] border-foreground rounded-tl-full opacity-60" />
                    </div>
                </motion.div>

                {/* Text */}
                <span className="text-4xl font-black tracking-tighter text-foreground relative top-[-1px]">
                    Monocle.
                </span>
            </div>
        </div>
    );
}
