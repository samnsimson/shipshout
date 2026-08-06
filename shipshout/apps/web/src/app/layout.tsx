import { Outfit } from 'next/font/google';
import { Provider } from '@/components/ui/provider';
import { Toaster } from '@/components/ui/toaster';
import './global.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
    title: 'ShipShout',
    description: 'Ship it. Shout about it. Automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={outfit.variable}>
            <body>
                <Provider>
                    {children}
                    <Toaster />
                </Provider>
            </body>
        </html>
    );
}
