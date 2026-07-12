/**
 * Minimal semver helpers for the deep-update scripts. Zero dependencies.
 * Handles the subset the pipeline needs: parse, compare, stable filter,
 * range prefixes (^ ~ >= =) stripping, and max-wins aggregation.
 */

const SEMVER_RE =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

export function stripRangePrefix(version) {
    if (typeof version !== "string") return version;
    return version.replace(/^[\^~=v]|^>=?/g, "").trim();
}

export function parse(version) {
    const clean = stripRangePrefix(String(version));
    const m = SEMVER_RE.exec(clean);
    if (!m) return null;
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
        prerelease: m[4] ?? null,
        raw: clean,
    };
}

export function isValid(version) {
    return parse(version) !== null;
}

export function isStable(version) {
    const p = parse(version);
    return p !== null && p.prerelease === null;
}

/** Standard semver precedence. Returns -1 | 0 | 1. Throws on invalid input. */
export function compare(a, b) {
    const pa = parse(a);
    const pb = parse(b);
    if (!pa || !pb) {
        throw new Error(`invalid semver comparison: "${a}" vs "${b}"`);
    }
    for (const key of ["major", "minor", "patch"]) {
        if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
    }
    if (pa.prerelease === pb.prerelease) return 0;
    if (pa.prerelease === null) return 1;
    if (pb.prerelease === null) return -1;
    const as = pa.prerelease.split(".");
    const bs = pb.prerelease.split(".");
    for (let i = 0; i < Math.max(as.length, bs.length); i++) {
        const x = as[i];
        const y = bs[i];
        if (x === undefined) return -1;
        if (y === undefined) return 1;
        const nx = /^\d+$/.test(x);
        const ny = /^\d+$/.test(y);
        if (nx && ny) {
            if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
        } else if (nx !== ny) {
            return nx ? -1 : 1;
        } else if (x !== y) {
            return x < y ? -1 : 1;
        }
    }
    return 0;
}

export function sortAscending(versions) {
    return [...versions].sort(compare);
}

/** Inclusive from..to filter over stable versions. */
export function stableInRange(versions, from, to) {
    return sortAscending(
        versions.filter(
            (v) =>
                isStable(v) &&
                compare(v, from) >= 0 &&
                compare(v, to) <= 0,
        ),
    );
}

/** Half-open span (from, to]: newer than `from`, up to and including `to`. */
export function stableInHalfOpenSpan(versions, from, to) {
    return sortAscending(
        versions.filter(
            (v) =>
                isStable(v) && compare(v, from) > 0 && compare(v, to) <= 0,
        ),
    );
}

export function maxVersion(versions) {
    const valid = versions.filter(isValid);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (compare(a, b) >= 0 ? a : b));
}

/** Most frequent value; semver-highest wins ties. */
export function mostCommon(versions) {
    if (versions.length === 0) return null;
    const counts = new Map();
    for (const v of versions) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best = null;
    for (const [v, n] of counts) {
        if (
            best === null ||
            n > best.n ||
            (n === best.n &&
                isValid(v) &&
                isValid(best.v) &&
                compare(v, best.v) > 0)
        ) {
            best = { v, n };
        }
    }
    return best.v;
}

/**
 * Max-wins aggregation across per-project occurrences of the same package.
 * occurrences: [{ projectName, currentVersion, targetVersion, location, sourceFile }]
 * Returns { effectiveTarget, mostCommonCurrent }.
 * Range prefixes are stripped for comparison; effectiveTarget is returned bare.
 */
export function maxWins(occurrences) {
    const targets = occurrences
        .map((o) => stripRangePrefix(o.targetVersion))
        .filter(isValid);
    const currents = occurrences
        .map((o) => stripRangePrefix(o.currentVersion))
        .filter(isValid);
    return {
        effectiveTarget: maxVersion(targets),
        mostCommonCurrent: mostCommon(currents),
    };
}
