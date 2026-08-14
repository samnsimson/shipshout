import { ComponentCard } from '@/components/component-card';
import { PageHeader } from '@/components/page-header';
import { getBrand } from '../../../../../lib/brand';
import { BrandForm } from './brand-form';

export default async function BrandSettings({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const brand = await getBrand(workspaceId);
    return (
        <>
            <PageHeader title="Brand voice" description="Tune how AI writes about your releases." />
            <ComponentCard title="Brand voice" desc="How ShipShout writes for you.">
                <BrandForm workspaceId={workspaceId} brand={brand} />
            </ComponentCard>
        </>
    );
}
