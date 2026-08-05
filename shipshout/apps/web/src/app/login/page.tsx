export default function LoginPage() {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
    return (
        <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
            <div>
                <h1>ShipShout</h1>
                <a href={url}>Sign in with GitHub</a>
            </div>
        </main>
    );
}
