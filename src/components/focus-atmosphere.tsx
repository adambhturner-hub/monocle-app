'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Volume2, VolumeX, Waves, CloudRain, Music2, Headphones, Zap, Coffee, TreePine, Train } from 'lucide-react';
import { soundEngine } from '@/lib/sound-engine';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export function FocusAtmosphere() {
    const [activeLayers, setActiveLayers] = useState<Record<string, number>>({});
    const [masterVolume, setMasterVolume] = useState(50); // 0-100
    const [muted, setMuted] = useState(false);

    // Sync with engine volume for ambient soundscapes
    useEffect(() => {
        soundEngine.setAmbientVolume(muted ? 0 : masterVolume / 100);
    }, [masterVolume, muted]);

    useEffect(() => {
        // Hydrate active layers from engine on mount
        const engineLayers = soundEngine.getActiveLayers();
        const newLayerState: Record<string, number> = {};
        engineLayers.forEach(layer => {
            newLayerState[layer] = 50; // default assumption, tracking exact volume isn't exposed yet
        });
        setActiveLayers(newLayerState);
    }, []);

    const toggleLayer = (type: 'white' | 'pink' | 'brown' | 'rain' | 'space' | 'cafe' | 'forest' | 'train') => {
        const isCurrentlyActive = !!activeLayers[type];

        if (isCurrentlyActive) {
            soundEngine.stopNoiseLayer(type);
            const next = { ...activeLayers };
            delete next[type];
            setActiveLayers(next);
        } else {
            const defaultVol = 50;
            soundEngine.toggleNoiseLayer(type, defaultVol / 100);
            setActiveLayers(prev => ({ ...prev, [type]: defaultVol }));
        }
    };

    const handleLayerVolume = (type: string, val: number) => {
        setActiveLayers(prev => ({ ...prev, [type]: val }));
        soundEngine.setNoiseLayerVolume(type, val / 100);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
                    {Object.keys(activeLayers).length > 0 ? <Headphones className="h-5 w-5 text-primary animate-pulse" /> : <Music2 className="h-5 w-5" />}
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
                                activeLayers['white'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('white')}
                        >
                            <Zap className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">White<br />Noise</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['pink'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('pink')}
                        >
                            <Waves className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Pink<br />Noise</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['brown'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('brown')}
                        >
                            <Waves className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Deep<br />Brown</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['rain'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('rain')}
                        >
                            <CloudRain className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Heavy<br />Rain</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['space'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('space')}
                        >
                            <Music2 className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Space<br />Drone</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['cafe'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('cafe')}
                        >
                            <Coffee className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Rainy<br />Cafe</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['forest'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('forest')}
                        >
                            <TreePine className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Deep<br />Forest</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex flex-col items-center gap-1 h-20 transition-all border-2",
                                activeLayers['train'] !== undefined
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-accent/50 text-muted-foreground"
                            )}
                            onClick={() => toggleLayer('train')}
                        >
                            <Train className="h-4 w-4" />
                            <span className="text-xs text-center leading-tight">Night<br />Train</span>
                        </Button>
                    </div>

                    {Object.entries(activeLayers).map(([type, layerVol]) => (
                        <div key={type} className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs font-medium capitalize">
                                <span>{type} Volume</span>
                                <span className="text-muted-foreground">{Math.round(layerVol)}%</span>
                            </div>
                            <Slider
                                value={[layerVol]}
                                max={100}
                                step={1}
                                onValueChange={(vals: number[]) => handleLayerVolume(type, vals[0])}
                                className="cursor-pointer"
                            />
                        </div>
                    ))}

                    <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>Master Ambient Volume</span>
                            <span>{Math.round(masterVolume)}%</span>
                        </div>
                        <Slider
                            value={[masterVolume]}
                            max={100}
                            step={1}
                            onValueChange={(vals: number[]) => setMasterVolume(vals[0])}
                            className="cursor-pointer"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
