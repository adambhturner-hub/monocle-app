
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Volume2, VolumeX, Waves, Zap, CloudRain, Music2 } from 'lucide-react';
import { soundEngine } from '@/lib/sound-engine';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export function FocusAtmosphere() {
    const [noiseType, setNoiseType] = useState<'white' | 'pink' | 'brown' | 'off'>('off');
    const [volume, setVolume] = useState(50); // 0-100
    const [muted, setMuted] = useState(false);

    // Sync with engine volume
    useEffect(() => {
        soundEngine.setVolume(muted ? 0 : volume / 100);
    }, [volume, muted]);

    const toggleNoise = (type: 'white' | 'pink' | 'brown') => {
        if (noiseType === type) {
            soundEngine.stopNoise();
            setNoiseType('off');
        } else {
            soundEngine.playNoise(type);
            setNoiseType(type);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
                    {noiseType !== 'off' ? <Waves className="h-5 w-5 text-primary animate-pulse" /> : <Music2 className="h-5 w-5" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none flex items-center gap-2">
                            Focus Atmosphere
                        </h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setMuted(!muted)}
                        >
                            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                noiseType === 'white'
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleNoise('white')}
                        >
                            <Zap className="h-4 w-4" />
                            <span className="text-xs">White</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                noiseType === 'pink'
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleNoise('pink')}
                        >
                            <Waves className="h-4 w-4" />
                            <span className="text-xs">Pink</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                noiseType === 'brown'
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleNoise('brown')}
                        >
                            <CloudRain className="h-4 w-4" />
                            <span className="text-xs">Brown</span>
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Volume</span>
                            <span>{Math.round(volume)}%</span>
                        </div>
                        <Slider
                            value={[volume]}
                            max={100}
                            step={1}
                            onValueChange={(vals: number[]) => setVolume(vals[0])}
                            className="cursor-pointer"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
