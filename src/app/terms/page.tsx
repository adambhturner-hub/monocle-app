import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <header className="px-6 py-6 md:px-12 md:py-8 flex justify-between items-center w-full max-w-4xl mx-auto border-b">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Monocle
                </Link>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 prose prose-neutral dark:prose-invert prose-headings:font-black prose-headings:tracking-tighter prose-h1:text-4xl prose-h2:text-2xl prose-p:leading-relaxed">
                <h1>Terms of Service</h1>
                <p className="text-muted-foreground font-medium mb-12">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2>1. Acceptance of Terms</h2>
                <p>By accessing or using Monocle ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>

                <h2>2. Description of Service</h2>
                <p>Monocle is a productivity and task management web application designed to help users focus on strictly prioritized action items. The Service is provided "as is" and "as available" without any warranties of any kind.</p>

                <h2>3. User Accounts</h2>
                <p>To use certain features of the Service (like Cloud Sync), you must register for an account using Google Authentication. You are responsible for safeguarding the password and credentials that you use to access the Service and for any activities or actions under your account.</p>

                <h2>4. User Data and Privacy</h2>
                <p>Your privacy is important to us. By using the Service, you agree that we may use your personal data in accordance with our Privacy Policy. For users relying solely on the "local-first" mode, your data remains exclusively on your device. Users who opt into Cloud Sync grant us permission to securely store their data on our servers to enable synchronization.</p>

                <h2>5. Acceptable Use</h2>
                <p>You agree not to use the Service:</p>
                <ul>
                    <li>In any way that violates any applicable national or international law or regulation.</li>
                    <li>To impersonate or attempt to impersonate Monocle, a Monocle employee, another user, or any other person or entity.</li>
                    <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service.</li>
                    <li>To attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service, the server on which the Service is stored, or any server, computer, or database connected to the Service.</li>
                </ul>

                <h2>6. Intellectual Property</h2>
                <p>The Service and its original content (excluding content provided by users), features, design, and functionality are and will remain the exclusive property of Monocle and its licensors. The Service is protected by copyright, trademark, and other laws.</p>

                <h2>7. Termination</h2>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms of Service. Upon termination, your right to use the Service will immediately cease.</p>

                <h2>8. Limitation of Liability</h2>
                <p>In no event shall Monocle, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.</p>

                <h2>9. Changes to Terms</h2>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

                <h2>10. Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us at adamturner@monocle.app.</p>
            </main>
        </div>
    );
}
