import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/ui/provider';
import { Toaster } from '@/components/ui/toaster';
import './global.css';

const heading = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
    title: 'ShipShout',
    description: 'Ship it. Shout about it. Automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={`${heading.variable} ${body.variable} ${mono.variable}`}>
            <body>
                <Provider>
                    {children}
                    <Toaster />
                </Provider>
            </body>
        </html>
    );
}
