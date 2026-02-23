'use client';

import { useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, User } from 'firebase/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { LogoSmall } from '@/components/logo';
import { toast } from 'sonner';

import { LandingPage } from './landing-page';

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

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
                <Activity className="h-8 w-8 text-primary animate-pulse" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="fixed inset-0 z-[100] bg-background animate-in fade-in duration-500 overflow-y-auto">
                <LandingPage onGoogleSignIn={handleGoogleSignIn} isSubmitting={isSubmitting} />
            </div>
        );
    }

    return <>{children}</>;
}
