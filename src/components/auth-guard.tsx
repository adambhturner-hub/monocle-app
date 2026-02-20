'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { LogoSmall } from '@/components/logo';
import { toast } from 'sonner';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsSubmitting(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success('Welcome back.');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success('Account created successfully.');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Authentication failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
                <Activity className="h-8 w-8 text-primary animate-pulse" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-500">
                <div className="w-full max-w-sm bg-card border rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center gap-3 mb-8">
                        <div className="h-14 w-14 bg-background rounded-2xl flex items-center justify-center border shadow-sm">
                            <LogoSmall showText={false} className="scale-125" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Monocle</h1>
                        <p className="text-sm text-muted-foreground text-center">
                            {isLogin ? 'Sign in to sync your tasks.' : 'Create an account to start syncing.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-background"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-background"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full font-bold shadow-md" disabled={isSubmitting}>
                            {isSubmitting ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline underline-offset-4"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
