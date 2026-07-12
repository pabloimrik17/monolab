import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenizeSelection, validateSubset } from "../validate-subset.mjs";

test("tokenizeSelection splits on commas outside quotes", () => {
    assert.deepEqual(
        tokenizeSelection('react, "react: useTransition, non-urgent", zod'),
        ["react", "react: useTransition, non-urgent", "zod"],
    );
    assert.deepEqual(tokenizeSelection(["a", " b "]), ["a", "b"]);
    assert.deepEqual(tokenizeSelection(""), []);
});

test("exact bump match beats improvement substring match", () => {
    const result = validateSubset({
        selection: "react",
        bumpNames: ["react", "zod"],
        improvementTitles: ["react: useTransition for non-urgent work"],
    });
    assert.deepEqual(result.bumpMatches, ["react"]);
    assert.deepEqual(result.improvementMatches, []);
    assert.ok(result.ok);
});

test("improvement tokens match by case-insensitive substring", () => {
    const result = validateSubset({
        selection: '"react: useTransition for non-urgent work", USETRANSITION',
        bumpNames: ["react"],
        improvementTitles: ["react: useTransition for non-urgent work"],
    });
    assert.equal(result.improvementMatches.length, 2);
    assert.deepEqual(
        result.improvementMatches[0].matchedTitles,
        ["react: useTransition for non-urgent work"],
    );
});

test("unmatched tokens flip ok to false", () => {
    const result = validateSubset({
        selection: "does-not-exist",
        bumpNames: ["react"],
        improvementTitles: [],
    });
    assert.ok(!result.ok);
    assert.deepEqual(result.unmatched, ["does-not-exist"]);
});
