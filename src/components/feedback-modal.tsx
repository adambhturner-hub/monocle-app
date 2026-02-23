'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                message,
                userId: auth.currentUser?.uid || 'anonymous',
                email: auth.currentUser?.email || 'N/A',
                appVersion: 'v1.0.0',
                deviceInfo: navigator.userAgent,
                timestamp: serverTimestamp(),
                resolved: false
            });

            toast.success("Feedback sent! Thank you.");
            setMessage('');
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to submit feedback", error);
            toast.error("Failed to send feedback. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
                    <DialogDescription>
                        Did this reduce decision fatigue for you? Did you encounter a bug? Let us know.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback-message" className="sr-only">Message</Label>
                        <Textarea
                            id="feedback-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your feedback here..."
                            className="min-h-[120px] resize-none"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !message.trim()}>
                            {isSubmitting ? 'Sending...' : 'Send Feedback'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
