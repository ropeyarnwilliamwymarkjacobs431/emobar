import { describe, it, expect } from "vitest";
import { computeStressIndex } from "../src/stress.js";

describe("computeStressIndex", () => {
  it("returns low stress for ideal state", () => {
    const si = computeStressIndex({
      load: 1, certainty: 10, connection: 10, energy: 10, friction: 1, keyword: "flow",
    });
    expect(si).toBeCloseTo(0.4);
  });

  it("returns high stress for worst state", () => {
    const si = computeStressIndex({
      load: 10, certainty: 1, connection: 1, energy: 1, friction: 10, keyword: "crisis",
    });
    expect(si).toBeCloseTo(9.4);
  });

  it("returns moderate stress for mixed state", () => {
    const si = computeStressIndex({
      load: 7, certainty: 5, connection: 8, energy: 6, friction: 3, keyword: "focused",
    });
    expect(si).toBeCloseTo(4.2);
  });

  it("rounds to one decimal place", () => {
    const si = computeStressIndex({
      load: 4, certainty: 7, connection: 10, energy: 9, friction: 0, keyword: "flow",
    });
    expect(si).toBe(1.6);
  });
});
