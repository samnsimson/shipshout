import { Generator } from './generator';

export default function TweetGeneratorPage() {
    return (
        <main style={{ padding: 32 }}>
            <h1>Release Notes → Tweet Generator</h1>
            <p>Turn your dev release notes into a ready-to-post tweet, free.</p>
            <Generator />
        </main>
    );
}
