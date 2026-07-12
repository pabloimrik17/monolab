import assert from "node:assert/strict";
import { test } from "vitest";
import {
    compare,
    isStable,
    isValid,
    maxVersion,
    maxWins,
    mostCommon,
    sortAscending,
    stableInHalfOpenSpan,
    stableInRange,
    stripRangePrefix,
} from "./semver.mjs";

test("stripRangePrefix removes ^ ~ = v and >=", () => {
    assert.equal(stripRangePrefix("^4.17.21"), "4.17.21");
    assert.equal(stripRangePrefix("~1.2.3"), "1.2.3");
    assert.equal(stripRangePrefix(">=2.0.0"), "2.0.0");
    assert.equal(stripRangePrefix("v3.0.0"), "3.0.0");
    assert.equal(stripRangePrefix("1.0.0"), "1.0.0");
});

test("isValid / isStable classify prereleases", () => {
    assert.ok(isValid("1.2.3"));
    assert.ok(isValid("1.2.3-rc.1"));
    assert.ok(!isValid("1.2"));
    assert.ok(isStable("1.2.3"));
    assert.ok(!isStable("19.0.0-canary.1234"));
});

test("compare follows semver precedence including prereleases", () => {
    assert.equal(compare("1.2.3", "1.2.3"), 0);
    assert.equal(compare("1.2.3", "1.2.4"), -1);
    assert.equal(compare("2.0.0", "1.99.99"), 1);
    assert.equal(compare("1.0.0-alpha", "1.0.0"), -1);
    assert.equal(compare("1.0.0-alpha.1", "1.0.0-alpha.2"), -1);
    assert.equal(compare("1.0.0-1", "1.0.0-alpha"), -1);
});

test("stableInRange is both-inclusive and stable-only", () => {
    const versions = ["1.0.0", "1.1.0", "1.2.0-rc.1", "1.2.0", "1.3.0"];
    assert.deepEqual(stableInRange(versions, "1.0.0", "1.2.0"), ["1.0.0", "1.1.0", "1.2.0"]);
});

test("stableInHalfOpenSpan excludes the installed from", () => {
    const versions = ["1.7.0", "1.7.1", "1.7.5", "1.7.9", "1.8.0"];
    assert.deepEqual(stableInHalfOpenSpan(versions, "1.7.0", "1.7.9"), ["1.7.1", "1.7.5", "1.7.9"]);
    assert.deepEqual(stableInHalfOpenSpan(versions, "1.7.9", "1.7.9"), []);
});

test("sortAscending orders semver, not lexicographic", () => {
    assert.deepEqual(sortAscending(["1.10.0", "1.2.0", "1.9.9"]), ["1.2.0", "1.9.9", "1.10.0"]);
});

test("maxVersion and mostCommon", () => {
    assert.equal(maxVersion(["1.0.0", "2.0.0", "1.5.0"]), "2.0.0");
    assert.equal(mostCommon(["1.0.0", "1.0.0", "2.0.0"]), "1.0.0");
    // Ties resolve to the semver-highest value.
    assert.equal(mostCommon(["1.0.0", "2.0.0"]), "2.0.0");
    assert.equal(mostCommon([]), null);
});

test("maxWins strips prefixes and picks max target + most-common current", () => {
    const { effectiveTarget, mostCommonCurrent } = maxWins([
        { currentVersion: "^1.0.0", targetVersion: "^1.2.0" },
        { currentVersion: "~1.0.0", targetVersion: "1.3.0" },
        { currentVersion: "1.1.0", targetVersion: "^1.2.5" },
    ]);
    assert.equal(effectiveTarget, "1.3.0");
    assert.equal(mostCommonCurrent, "1.0.0");
});
