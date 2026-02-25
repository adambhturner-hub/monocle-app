'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LogoSmall } from './logo';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // You could also log the error to an error reporting service here (e.g., Sentry)
        console.error('Uncaught error:', error, errorInfo);
    }

    public handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="w-full max-w-md bg-card ring-1 ring-border rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center gap-6 relative">
                        <div className="absolute top-0 inset-x-0 h-1 bg-red-500/50" />

                        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight">Monocle ran into a snag.</h1>
                            <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                                The application encountered an unexpected error and could not render this screen.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="w-full bg-secondary/50 p-4 rounded-xl text-xs text-left overflow-x-auto text-muted-foreground font-mono">
                                {this.state.error.message}
                            </div>
                        )}

                        <div className="pt-4 w-full border-t border-border/50">
                            <Button onClick={this.handleReload} className="w-full rounded-full" size="lg">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reload Application
                            </Button>
                        </div>
                    </div>

                    <div className="mt-8 opacity-50 block hover:opacity-100 transition-opacity">
                        <LogoSmall showText={false} />
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
