import { Inter } from 'next/font/google';
import { Provider } from '../components/ui/provider';
import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
    title: 'Shipshout',
    description: 'Shipshout client dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body>
                <Provider>{children}</Provider>
            </body>
        </html>
    );
}
