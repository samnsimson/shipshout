'use client';

import { useState } from 'react';
import { saveBrand } from '../../../../../lib/brand';

type Brand = {
  tone: string;
  customInstructions?: string;
  emojiPolicy: boolean;
};

export function BrandForm({ workspaceId, brand }: { workspaceId: string; brand: Brand }) {
  const [tone, setTone] = useState(brand.tone);
  const [customInstructions, setCustomInstructions] = useState(brand.customInstructions ?? '');
  const [emojiPolicy, setEmojiPolicy] = useState(brand.emojiPolicy);
  const [saved, setSaved] = useState(false);

  return (
    <form
      style={{ display: 'grid', gap: 16, maxWidth: 560 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await saveBrand(workspaceId, {
          tone,
          customInstructions: customInstructions || undefined,
          emojiPolicy,
        });
        setSaved(true);
      }}
    >
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Tone</span>
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="dev_focused">Developer-focused</option>
          <option value="professional">Professional</option>
          <option value="hype_startup">Hype startup</option>
        </select>
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Custom instructions</span>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={4}
          placeholder="Optional brand guidance for AI copy…"
        />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={emojiPolicy}
          onChange={(e) => setEmojiPolicy(e.target.checked)}
        />
        Allow emojis in generated copy
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit">Save</button>
        {saved ? <span style={{ color: '#059669' }}>Saved</span> : null}
      </div>
    </form>
  );
}
