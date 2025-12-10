// =============================================================================
// PARTICLE SYSTEM CONFIGURATION
// Exposed config for ThreeParticles visual tuning
// =============================================================================

export interface ParticleConfig {
  /** Total number of particles in the scene */
  count: number;
  /** Base particle size (affected by sizeAttenuation) */
  size: number;
  /** Particle opacity (0-1) */
  opacity: number;
  /** Camera Z distance from origin */
  cameraZ: number;
  /** Physics force multiplier for shape formation */
  formationForce: number;
  /** Physics damping (higher = more viscous, slower) */
  damping: number;
  /** Dispersion noise multiplier when released */
  dispersionNoise: number;
  /** Auto-rotation speed when shape is formed */
  autoRotationSpeed: number;
}

/**
 * Default particle configuration.
 * Reduced to slow, ambient starfield effect - not gnat swarm.
 */
export const PARTICLE_CONFIG: ParticleConfig = {
  // Reduced from 1000 to 500 for 50% reduction (subtle starfield)
  count: 500,

  // Visual appearance
  size: 0.45,        // Slightly larger to compensate for fewer particles
  opacity: 0.30,     // More transparent for subtle effect

  // Camera
  cameraZ: 80,

  // Physics
  formationForce: 0.0003,    // Slower shape formation
  damping: 0.99,             // More viscous = slower, floatier motion
  dispersionNoise: 0.06,     // Much slower random movement

  // Animation
  autoRotationSpeed: 0.005,  // Slower auto-rotation for calm effect
};

/**
 * High-density configuration for special effects or premium modes.
 */
export const PARTICLE_CONFIG_HD: ParticleConfig = {
  count: 8000,
  size: 0.22,
  opacity: 0.6,
  cameraZ: 75,
  formationForce: 0.0005,
  damping: 0.98,
  dispersionNoise: 0.15,
  autoRotationSpeed: 0.01,
};

/**
 * Low-density configuration for performance or mobile.
 */
export const PARTICLE_CONFIG_LITE: ParticleConfig = {
  count: 500,
  size: 0.45,
  opacity: 0.3,
  cameraZ: 80,
  formationForce: 0.0008,
  damping: 0.97,
  dispersionNoise: 0.12,
  autoRotationSpeed: 0.008,
};
