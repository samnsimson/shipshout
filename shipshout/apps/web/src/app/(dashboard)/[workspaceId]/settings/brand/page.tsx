import { getBrand } from '../../../../../lib/brand';
import { BrandForm } from './brand-form';

export default async function BrandSettings({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const brand = await getBrand(workspaceId);
    return (
        <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Brand voice</h1>
            <BrandForm workspaceId={workspaceId} brand={brand} />
        </main>
    );
}
