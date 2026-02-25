'use client';

import { useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, User } from 'firebase/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { LogoSmall } from '@/components/logo';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

import { LandingPage } from './landing-page';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // We need to know if we are rendering inside the desktop floating window
    // so we can render a compact, transparent login form instead of the full hero.
    const pathname = usePathname();
    const isDesktopRoute = pathname === '/desktop';

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

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        try {
            await signInWithPopup(auth, googleProvider);
            toast.success('Welcome back.');
        } catch (error: any) {
            console.error(error);
            if (error.code !== 'auth/popup-closed-by-user') {
                toast.error(error.message || 'Google sign-in failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            toast.error('Please enter your email address first.');
            return;
        }
        setIsSubmitting(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success('Password setup email sent! Check your inbox to link a password to your Google account.');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to send password reset email.');
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
        if (isDesktopRoute) {
            return (
                <div className="min-h-screen bg-transparent w-full p-4 flex items-start justify-center pt-[10vh]">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        html, body { background-color: transparent !important; }
                    `}} />
                    <div className="w-full max-w-xl shadow-2xl rounded-2xl overflow-hidden ring-1 ring-border bg-card animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 flex flex-col items-center justify-center gap-6">
                            <LogoSmall showText={true} />
                            <div className="text-center space-y-2">
                                <h2 className="text-lg font-bold">Sign in to Capture</h2>
                                <p className="text-sm text-muted-foreground">You must be logged into Monocle to use the desktop capture shortcut.</p>
                            </div>
                            <form onSubmit={(e) => { setIsLogin(true); handleSubmit(e); }} className="w-full max-w-xs space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full"
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !email || !password}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isSubmitting ? <Activity className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Sign In with Email
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={isSubmitting || !email}
                                    onClick={handleResetPassword}
                                    className="w-full text-xs text-muted-foreground"
                                >
                                    Used Google? Send Password Setup Email
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-[100] bg-background animate-in fade-in duration-500 overflow-y-auto">
                <LandingPage onGoogleSignIn={handleGoogleSignIn} isSubmitting={isSubmitting} />
            </div>
        );
    }

    return <>{children}</>;
}
