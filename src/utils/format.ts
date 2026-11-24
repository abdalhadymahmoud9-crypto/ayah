export interface ScholarlyReference {
  title: string;
  excerpt: string;
  location?: string;
}

export interface FormattedMessage {
  html: string;
  followUps: string[];
  references: ScholarlyReference[];
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function extractReferencesAndFollowUps(text: string): {
  cleanedText: string;
  followUps: string[];
  references: ScholarlyReference[];
} {
  let cleanedText = text.replace(/\[\[نازلة\]\]/g, '').trim();
  const followUps: string[] = [];
  const references: ScholarlyReference[] = [];

  // Extract [[متابعة]]
  const followUpMatch = cleanedText.match(/\[\[متابعة\]\]([\s\S]*)$/);
  if (followUpMatch) {
    const rawFollowUps = followUpMatch[1];
    cleanedText = cleanedText.replace(/\[\[متابعة\]\][\s\S]*$/, '').trim();
    rawFollowUps
      .split('\n')
      .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(line => line.length > 0 && line !== '[[متابعة]]')
      .forEach(q => followUps.push(q));
  }

  // Extract [[مراجع]]
  const refMatch = cleanedText.match(/\[\[مراجع\]\]([\s\S]*)$/);
  if (refMatch) {
    const rawRefs = refMatch[1];
    cleanedText = cleanedText.replace(/\[\[مراجع\]\][\s\S]*$/, '').trim();

    const lines = rawRefs.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== '[[مراجع]]');
    for (const line of lines) {
      const cleanLine = line.replace(/^[-*•\d.)\s]+/, '').trim();
      if (!cleanLine) continue;

      // Pattern: الكتاب/المتن: ... | النص/الشاهد: ... | الموضع/الباب: ...
      let title = '';
      let excerpt = '';
      let location = '';

      if (cleanLine.includes('|')) {
        const parts = cleanLine.split('|').map(p => p.trim());
        for (const p of parts) {
          if (/^(?:الكتاب|المتن|المرجع)\s*[:：]/i.test(p)) {
            title = p.replace(/^(?:الكتاب|المتن|المرجع)\s*[:：]\s*/i, '').trim();
          } else if (/^(?:النص|الشاهد|نص المتن)\s*[:：]/i.test(p)) {
            excerpt = p.replace(/^(?:النص|الشاهد|نص المتن)\s*[:：]\s*/i, '').trim();
          } else if (/^(?:الموضع|الباب|الفصل|المصدر)\s*[:：]/i.test(p)) {
            location = p.replace(/^(?:الموضع|الباب|الفصل|المصدر)\s*[:：]\s*/i, '').trim();
          } else if (!title) {
            title = p;
          } else if (!excerpt) {
            excerpt = p;
          } else if (!location) {
            location = p;
          }
        }
      } else {
        // Fallback for lines without pipe
        const colonIdx = cleanLine.indexOf(':');
        if (colonIdx > 0) {
          title = cleanLine.substring(0, colonIdx).replace(/^(?:الكتاب|المتن|المرجع)\s*/i, '').trim();
          excerpt = cleanLine.substring(colonIdx + 1).trim();
        } else {
          title = 'متن معتمد';
          excerpt = cleanLine;
        }
      }

      const cleanField = (s: string) => s.replace(/^[[«"'\s]+|[\]»"'\s]+$/g, '').trim();
      title = cleanField(title);
      excerpt = cleanField(excerpt);
      if (location) location = cleanField(location);

      if (title || excerpt) {
        references.push({
          title: title || 'متن علمي معتمد',
          excerpt: excerpt || '',
          location: location || undefined,
        });
      }
    }
  }

  return { cleanedText, followUps, references };
}

export function formatContent(rawText: string): FormattedMessage {
  const { cleanedText, followUps, references } = extractReferencesAndFollowUps(rawText);

  let html = escapeHtml(cleanedText)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^#+\s*(.+)$/gm, '<b>$1</b>')
    .replace(/^[-*]\s+(.+)$/gm, '• $1')
    .replace(/﴿([^﴾]+)﴾/g, '<span class="ayah">﴿$1﴾</span>')
    .replace(/«([^»]+)»/g, '<span class="matn-quote">«$1»</span>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/\n/g, '<br>');

  return {
    html,
    followUps,
    references,
  };
}
