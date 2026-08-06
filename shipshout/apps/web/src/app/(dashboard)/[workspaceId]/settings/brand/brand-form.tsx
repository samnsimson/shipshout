'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, NativeSelect, Stack, Switch, Textarea } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { saveBrand } from '../../../../../lib/brand';
import { handleForbiddenClient } from '../../../../../lib/forbidden';

type Brand = { tone: string; customInstructions?: string; emojiPolicy: boolean };

export function BrandForm({ workspaceId, brand }: { workspaceId: string; brand: Brand }) {
    const router = useRouter();
    const [tone, setTone] = useState(brand.tone);
    const [customInstructions, setCustomInstructions] = useState(brand.customInstructions ?? '');
    const [emojiPolicy, setEmojiPolicy] = useState(brand.emojiPolicy);
    const [saving, setSaving] = useState(false);

    return (
        <Card.Root maxW="2xl">
            <Card.Body>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setSaving(true);
                        try {
                            await saveBrand(workspaceId, { tone, customInstructions: customInstructions || undefined, emojiPolicy });
                            toaster.create({ type: 'success', title: 'Brand voice saved' });
                        } catch (error) {
                            if (handleForbiddenClient(error, router.push)) return;
                            toaster.create({ type: 'error', title: "Couldn't save brand voice" });
                        } finally {
                            setSaving(false);
                        }
                    }}
                >
                    <Stack gap="5">
                        <Field label="Tone">
                            <NativeSelect.Root>
                                <NativeSelect.Field value={tone} onChange={(e) => setTone(e.target.value)}>
                                    <option value="dev_focused">Developer-focused</option>
                                    <option value="professional">Professional</option>
                                    <option value="hype_startup">Hype startup</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field>
                        <Field label="Custom instructions" helperText="Optional brand guidance for AI copy.">
                            <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={4} placeholder="Optional brand guidance for AI copy…" />
                        </Field>
                        <Switch.Root checked={emojiPolicy} onCheckedChange={(e) => setEmojiPolicy(e.checked)}>
                            <Switch.HiddenInput />
                            <Switch.Control />
                            <Switch.Label>Allow emojis in generated copy</Switch.Label>
                        </Switch.Root>
                        <Button type="submit" colorPalette="signal" loading={saving} alignSelf="flex-start">
                            Save
                        </Button>
                    </Stack>
                </form>
            </Card.Body>
        </Card.Root>
    );
}
