import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <header className="px-6 py-6 md:px-12 md:py-8 flex justify-between items-center w-full max-w-4xl mx-auto border-b">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Monocle
                </Link>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 prose prose-neutral dark:prose-invert prose-headings:font-black prose-headings:tracking-tighter prose-h1:text-4xl prose-h2:text-2xl prose-p:leading-relaxed">
                <h1>Privacy Policy</h1>
                <p className="text-muted-foreground font-medium mb-12">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2>1. Introduction</h2>
                <p>Welcome to Monocle ("we", "our", or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our application.</p>

                <h2>2. Data We Collect</h2>
                <p>Monocle is designed as a "local-first" application.</p>
                <ul>
                    <li><strong>Authentication Data:</strong> If you choose to log in using Google Authentication, we collect basic profile information (such as your name and email address) necessary to create and manage your account.</li>
                    <li><strong>Application Data (Tasks & Activity):</strong> By default, all your tasks, logs, and focus data are stored locally on your device using IndexedDB. If you opt-in to Cloud Sync, this data is securely transmitted and stored in our database (Google Firebase/Firestore) solely for the purpose of synchronizing your data across devices.</li>
                    <li><strong>Analytics:</strong> We use basic, privacy-respecting analytics (Vercel Analytics) to understand general traffic and usage patterns. We do not track individual behavior across other websites.</li>
                </ul>

                <h2>3. How We Use Your Data</h2>
                <p>We use your information exclusively to:</p>
                <ul>
                    <li>Provide, operate, and maintain the Monocle application.</li>
                    <li>Enable cross-device synchronization (if you enable Cloud Sync).</li>
                    <li>Respond to your customer service requests and support needs.</li>
                </ul>
                <p><strong>We will never sell your personal data to third parties.</strong></p>

                <h2>4. Data Storage and Security</h2>
                <p>Your authentication and sync data is securely stored using Google Cloud infrastructure (Firebase/Firestore). We employ industry-standard security measures to protect your data from unauthorized access, alteration, disclosure, or destruction.</p>

                <h2>5. Third-Party Services</h2>
                <p>We use the following third-party services that may process your data:</p>
                <ul>
                    <li><strong>Google OAuth:</strong> For authentication and account creation.</li>
                    <li><strong>Google Firebase:</strong> For secure database hosting and cloud sync.</li>
                    <li><strong>Vercel:</strong> For hosting the application and basic web analytics.</li>
                </ul>

                <h2>6. Your Rights</h2>
                <p>You have the right to access, update, or delete your personal information. If you wish to permanently delete your Monocle account and all associated cloud data, please contact us or use the account deletion features provided within the app settings.</p>

                <h2>7. Contact Us</h2>
                <p>If you have any questions or concerns about this Privacy Policy, please contact us at adamturner@monocle.app.</p>
            </main>
        </div>
    );
}
