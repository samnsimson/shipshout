'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Button, Card, Clipboard, Container, Show, Text, Textarea } from '@chakra-ui/react';
import { LuCheck, LuClipboard } from 'react-icons/lu';

export async function generateTweet(releaseNotes: string): Promise<{ tweet: string }> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const res = await fetch(`${base}/api/public/tweet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ releaseNotes }),
    });
    if (res.status === 429) throw new Error('Rate limit reached — sign up for more.');
    if (!res.ok) throw new Error('Generation failed');
    return res.json();
}

export function Generator() {
    const [notes, setNotes] = useState('');
    const [tweet, setTweet] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    async function run() {
        setErr('');
        setLoading(true);
        try {
            setTweet((await generateTweet(notes)).tweet);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container maxW="2xl">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Paste your GitHub release notes or commit log..." bg="bg.panel" />
            <Button mt="4" size="lg" colorPalette="signal" onClick={run} loading={loading} loadingText="Generating…" disabled={!notes}>
                Generate tweet
            </Button>
            <Show when={err}>
                {(message) => (
                    <Text color="fg.error" mt="3">
                        {message}
                    </Text>
                )}
            </Show>
            <Show when={tweet}>
                {(content) => (
                    <Card.Root mt="6">
                        <Card.Body>
                            <Text>{content}</Text>
                        </Card.Body>
                        <Card.Footer>
                            <Clipboard.Root value={content}>
                                <Clipboard.Trigger asChild>
                                    <Button size="sm" variant="surface">
                                        <Clipboard.Indicator copied={<LuCheck />}>
                                            <LuClipboard />
                                        </Clipboard.Indicator>
                                        <Clipboard.CopyText />
                                    </Button>
                                </Clipboard.Trigger>
                            </Clipboard.Root>
                        </Card.Footer>
                    </Card.Root>
                )}
            </Show>
            <Text mt="8" textAlign="center" color="fg.muted">
                Want automatic multi-channel posts on every release?{' '}
                <NextLink href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Sign up for ShipShout →
                </NextLink>
            </Text>
        </Container>
    );
}
