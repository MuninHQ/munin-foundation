import test from "node:test";
import assert from "node:assert/strict";
import { andreBrandProfile, authorityFlywheel, evaluateBrandCandidate } from "../src/personal-brand-intelligence.js";

test("ships the seeded Andre positioning", () => {
  assert.match(andreBrandProfile.tribe, /financial infrastructure/i);
  assert.equal(andreBrandProfile.theses.length, 5);
});

test("recommends evidence-backed content connected to an owned thesis", () => {
  const result = evaluateBrandCandidate({
    topic: "stablecoins and payments infrastructure",
    angle: "why settlement rails evolve rather than disappear",
    source: "Banco Central do Brasil",
    thesisIds: ["THESIS-003"]
  });
  assert.equal(result.publish, true);
  assert.ok(result.score >= 70);
  assert.equal(result.matchedTheses.some((item) => item.id === "THESIS-003"), true);
});

test("keeps unsupported generic ideas below publish threshold", () => {
  const result = evaluateBrandCandidate({
    topic: "leadership",
    angle: "five trends everyone should know"
  });
  assert.equal(result.publish, false);
});

test("models authority as professional opportunity rather than follower count", () => {
  assert.deepEqual(authorityFlywheel(), ["insight", "recognition", "follow", "recurring-exposure", "conversation", "professional-opportunity"]);
});
