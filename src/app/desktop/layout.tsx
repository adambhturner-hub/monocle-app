import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Monocle Desktop Capture',
};

export default function DesktopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-transparent w-full p-4 flex items-start justify-center pt-[10vh]">
            <style dangerouslySetInnerHTML={{
                __html: `
                body { background-color: transparent !important; }
            `}} />
            {children}
        </div>
    );
}
