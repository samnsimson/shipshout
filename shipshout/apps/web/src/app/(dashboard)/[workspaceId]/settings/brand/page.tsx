import { PageHeader } from '@/components/page-header';
import { getBrand } from '../../../../../lib/brand';
import { BrandForm } from './brand-form';

export default async function BrandSettings({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const brand = await getBrand(workspaceId);
    return (
        <>
            <PageHeader title="Brand voice" description="Tune how AI writes about your releases." />
            <BrandForm workspaceId={workspaceId} brand={brand} />
        </>
    );
}
