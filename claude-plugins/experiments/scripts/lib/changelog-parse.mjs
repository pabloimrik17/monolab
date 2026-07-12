/**
 * CHANGELOG parsing per the npm-changelog Step 5 rules: pattern detection
 * over the first 50 lines (priority order, first match), section extraction
 * with Angular-anchor and setext special cases, and version matching.
 */

export const PATTERNS = [
    {
        id: "conventional-changelog",
        regex: /^## \[\d+\.\d+\.\d+.*?\]\(.+?\) \(.+\)$/,
    },
    { id: "standard-h2-date", regex: /^## \d+\.\d+\.\d+.* \(.+\)$/ },
    { id: "standard-h2-v-date", regex: /^## v\d+\.\d+\.\d+.* \(.+\)$/ },
    { id: "h1-date", regex: /^# \d+\.\d+\.\d+.* \(.+\)$/ },
    { id: "h1-bare", regex: /^# \d+\.\d+\.\d+[^ ]*$/ },
    { id: "h2-bare", regex: /^## \d+\.\d+\.\d+[^ ]*$/ },
    { id: "setext", regex: /^\d+\.\d+\.\d+ \/ .+$/ },
    { id: "eslint-style", regex: /^v\d+\.\d+\.\d+.* - .+$/ },
    { id: "universal-fallback", regex: /^#{0,2}\s*\[?v?\d+\.\d+\.\d+/ },
];

/** First pattern (priority order) matching any of the first 50 lines. */
export function detectPattern(content) {
    const head = content.split("\n", 50);
    for (const pattern of PATTERNS) {
        if (head.some((line) => pattern.regex.test(line))) return pattern;
    }
    return null;
}

/** Extract the clean X.Y.Z semver from a matched heading line. */
export function versionFromHeading(line) {
    const m = /\[?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?)/.exec(line);
    return m ? m[1] : null;
}

/**
 * Split a changelog into version sections using the detected pattern.
 * Returns Map<version, sectionText>. Sections include a preceding
 * `<a name=...>` anchor line and a following setext `===` underline.
 */
export function extractSections(content, pattern = detectPattern(content)) {
    const sections = new Map();
    if (!pattern) return sections;
    const lines = content.split("\n");
    const headings = [];
    for (let i = 0; i < lines.length; i++) {
        if (pattern.regex.test(lines[i])) {
            const version = versionFromHeading(lines[i]);
            if (version) headings.push({ index: i, version });
        }
    }
    for (let h = 0; h < headings.length; h++) {
        let start = headings[h].index;
        if (start > 0 && /^<a name=".*">/.test(lines[start - 1])) start--;
        const end =
            h + 1 < headings.length
                ? (() => {
                      let next = headings[h + 1].index;
                      if (next > 0 && /^<a name=".*">/.test(lines[next - 1])) {
                          next--;
                      }
                      return next;
                  })()
                : lines.length;
        const version = headings[h].version;
        if (!sections.has(version)) {
            sections.set(version, lines.slice(start, end).join("\n"));
        }
    }
    return sections;
}
