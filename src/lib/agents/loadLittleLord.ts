// =============================================================================
// LOAD LITTLE LORD — Loads spec and corpus for Little Lord AI agent
// =============================================================================

import spec from "./little_lord_spec.json";
import corpus from "../corpus/apex_frame_corpus.txt?raw";

export function loadLittleLord() {
  return {
    spec,
    corpus
  };
}
