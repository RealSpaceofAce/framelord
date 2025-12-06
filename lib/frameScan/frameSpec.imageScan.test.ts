import { describe, it, expect } from "vitest";
import { frameScanSpec } from "./frameSpec";

describe("frameScanSpec image_scan doctrine", () => {
  it("includes polarity_dynamics and female_presentation_dynamics blocks", () => {
    const imageScan = (frameScanSpec as any).image_scan;
    expect(imageScan).toBeDefined();
    expect(imageScan.detection_rules).toBeDefined();

    const rules = imageScan.detection_rules;
    expect(rules.polarity_dynamics).toBeDefined();
    expect(rules.female_presentation_dynamics).toBeDefined();
  });

  it("polarity_dynamics has male_subject and female_partner cues", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const polarity = rules.polarity_dynamics;

    expect(polarity.male_subject).toBeDefined();
    expect(Array.isArray(polarity.male_subject.positive_cues)).toBe(true);
    expect(Array.isArray(polarity.male_subject.negative_cues)).toBe(true);

    expect(polarity.female_partner).toBeDefined();
    expect(Array.isArray(polarity.female_partner.positive_cues)).toBe(true);
    expect(Array.isArray(polarity.female_partner.negative_cues)).toBe(true);
  });

  it("polarity_dynamics has couple_axis_rules with cues", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const polarity = rules.polarity_dynamics;

    expect(polarity.couple_axis_rules).toBeDefined();
    expect(polarity.couple_axis_rules.description).toBeDefined();
    expect(Array.isArray(polarity.couple_axis_rules.positive_cues)).toBe(true);
    expect(Array.isArray(polarity.couple_axis_rules.negative_cues)).toBe(true);
  });

  it("female_presentation_dynamics has alignment_cues with positive and negative arrays", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const fpd = rules.female_presentation_dynamics;

    expect(fpd.alignment_cues).toBeDefined();
    expect(Array.isArray(fpd.alignment_cues.positive)).toBe(true);
    expect(Array.isArray(fpd.alignment_cues.negative)).toBe(true);
  });

  it("female_presentation_dynamics has sexual_display_cues with positive and negative arrays", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const fpd = rules.female_presentation_dynamics;

    expect(fpd.sexual_display_cues).toBeDefined();
    expect(Array.isArray(fpd.sexual_display_cues.positive)).toBe(true);
    expect(Array.isArray(fpd.sexual_display_cues.negative)).toBe(true);
  });

  it("female_presentation_dynamics has posture_and_orientation with positive and negative arrays", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const fpd = rules.female_presentation_dynamics;

    expect(fpd.posture_and_orientation).toBeDefined();
    expect(Array.isArray(fpd.posture_and_orientation.positive)).toBe(true);
    expect(Array.isArray(fpd.posture_and_orientation.negative)).toBe(true);
  });

  it("female_presentation_dynamics has respect_and_relational_signal with positive and negative arrays", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const fpd = rules.female_presentation_dynamics;

    expect(fpd.respect_and_relational_signal).toBeDefined();
    expect(Array.isArray(fpd.respect_and_relational_signal.positive)).toBe(true);
    expect(Array.isArray(fpd.respect_and_relational_signal.negative)).toBe(true);
  });

  it("polarity_dynamics has a description field", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const polarity = rules.polarity_dynamics;

    expect(typeof polarity.description).toBe("string");
    expect(polarity.description.length).toBeGreaterThan(0);
  });

  it("female_presentation_dynamics has a description field", () => {
    const rules = (frameScanSpec as any).image_scan.detection_rules;
    const fpd = rules.female_presentation_dynamics;

    expect(typeof fpd.description).toBe("string");
    expect(fpd.description.length).toBeGreaterThan(0);
  });
});






