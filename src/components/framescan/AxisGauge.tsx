// =============================================================================
// AXIS GAUGE — Animated dial gauge for FrameScan axis scoring
// =============================================================================
// Displays a -3 to +3 score with needle animation and band classification.
// Uses -120 to +120 degree arc for visual range.
// Shows "NOT ENOUGH CONTEXT" overlay when score is null.
// Uses neon HUD styling with glowing chrome borders.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import type { FrameBand } from '../../lib/frameScan/frameTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface AxisGaugeProps {
  label: string;
  score: number | null;  // -3 to +3, null = insufficient context
  band: FrameBand;
  size?: 'small' | 'medium' | 'large';
  min?: number;          // default -3
  max?: number;          // default +3
}

// =============================================================================
// BAND COLORS — Matching the neon HUD spec
// =============================================================================

// ALL BLUE/CYAN PALETTE — NO GREEN
const BAND_COLORS: Record<FrameBand, string> = {
  strong_slave: '#ff3155',   // Red
  mild_slave: '#ffbf3b',     // Amber
  neutral: '#627dff',        // Soft blue
  mild_apex: '#8fd2ff',      // Soft cyan
  strong_apex: '#5fe0ff',    // Bright cyan
};

const BAND_CSS_MODIFIERS: Record<FrameBand, string> = {
  strong_slave: 'strong-slave',
  mild_slave: 'mild-slave',
  neutral: 'neutral',
  mild_apex: 'mild-apex',
  strong_apex: 'strong-apex',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AxisGauge: React.FC<AxisGaugeProps> = ({
  label,
  score,
  band,
  size = 'medium',
  min = -3,
  max = 3,
}) => {
  // Size configurations
  const sizeConfig = {
    small: { diameter: 90, needleLength: 28 },
    medium: { diameter: 120, needleLength: 38 },
    large: { diameter: 150, needleLength: 50 },
  };

  const config = sizeConfig[size];
  const diameter = config.diameter;
  const center = diameter / 2;
  const arcRadius = center - 12;
  const needleLength = config.needleLength;

  // Calculate needle angle using -120 to +120 degree arc
  // Score of -3 → -120°, score of 0 → 0°, score of +3 → +120°
  const calculateAngleDeg = (value: number | null): number => {
    if (value === null) return 0; // Center position for null
    const clamped = Math.max(min, Math.min(max, value));
    const t = (clamped - min) / (max - min); // 0..1
    return -120 + t * 240; // -120..+120
  };

  const angleDeg = calculateAngleDeg(score);
  const bandColor = BAND_COLORS[band];
  const bandModifier = BAND_CSS_MODIFIERS[band];
  const isInsufficient = score === null;

  // Format band label
  const formatBandLabel = (b: FrameBand): string => {
    return b.replace(/_/g, ' ').toUpperCase();
  };

  // Generate tick marks at -3, -2, -1, 0, 1, 2, 3
  const ticks = [-3, -2, -1, 0, 1, 2, 3];

  // Convert tick value to angle
  const tickToAngle = (tickValue: number): number => {
    const t = (tickValue - min) / (max - min);
    return -120 + t * 240;
  };

  return (
    <div className="axis-gauge-container">
      <div
        className={`axis-gauge-dial axis-gauge-dial--${size}${isInsufficient ? ' axis-gauge-dial--insufficient' : ''}`}
        style={{ width: diameter, height: diameter }}
      >
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
        >
          {/* Gradient definitions */}
          <defs>
            {/* Inner radial gradient for dial face */}
            <radialGradient id={`gauge-bg-${label}-${size}`} cx="50%" cy="60%" r="80%">
              <stop offset="0%" stopColor="rgba(20, 40, 70, 0.4)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
            </radialGradient>

            {/* Glow filter for needle */}
            <filter id={`needle-glow-${label}-${size}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle fill */}
          <circle
            cx={center}
            cy={center}
            r={center - 2}
            fill={`url(#gauge-bg-${label}-${size})`}
          />

          {/* Arc track (the dial background arc) */}
          <path
            d={describeArc(center, center, arcRadius, -120, 120)}
            fill="none"
            stroke="rgba(132, 223, 255, 0.15)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Colored arc segment from center to score position */}
          {score !== null && (
            <path
              d={describeArc(center, center, arcRadius, Math.min(0, angleDeg), Math.max(0, angleDeg))}
              fill="none"
              stroke={bandColor}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.7"
            />
          )}

          {/* Tick marks */}
          {ticks.map((tickValue) => {
            const tickAngle = tickToAngle(tickValue);
            const angleRad = (tickAngle - 90) * (Math.PI / 180);
            const isMajor = tickValue === 0 || Math.abs(tickValue) === 3;
            const tickInner = arcRadius - (isMajor ? 10 : 6);
            const tickOuter = arcRadius + 2;

            const x1 = center + tickInner * Math.cos(angleRad);
            const y1 = center + tickInner * Math.sin(angleRad);
            const x2 = center + tickOuter * Math.cos(angleRad);
            const y2 = center + tickOuter * Math.sin(angleRad);

            return (
              <line
                key={tickValue}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? 'rgba(154, 209, 255, 0.8)' : 'rgba(132, 223, 255, 0.4)'}
                strokeWidth={isMajor ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Tick labels for -3, 0, +3 */}
          {[-3, 0, 3].map((tickValue) => {
            const tickAngle = tickToAngle(tickValue);
            const angleRad = (tickAngle - 90) * (Math.PI / 180);
            const labelRadius = arcRadius - (size === 'small' ? 18 : 22);
            const x = center + labelRadius * Math.cos(angleRad);
            const y = center + labelRadius * Math.sin(angleRad);

            return (
              <text
                key={`label-${tickValue}`}
                x={x}
                y={y}
                fill="rgba(154, 209, 255, 0.7)"
                fontSize={size === 'small' ? 9 : 11}
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tickValue > 0 ? `+${tickValue}` : tickValue}
              </text>
            );
          })}

          {/* Needle - positioned at center, rotated by angleDeg */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: angleDeg }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          >
            {/* Needle line pointing up (will be rotated) */}
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - needleLength}
              stroke={bandColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter={`url(#needle-glow-${label}-${size})`}
            />
            {/* Needle tip */}
            <circle
              cx={center}
              cy={center - needleLength + 1}
              r="3"
              fill={bandColor}
              filter={`url(#needle-glow-${label}-${size})`}
            />
          </motion.g>

          {/* Center pivot dot */}
          <circle
            cx={center}
            cy={center}
            r="6"
            fill="#5fe0ff"
            filter={`url(#needle-glow-${label}-${size})`}
          />
          <circle
            cx={center}
            cy={center}
            r="3"
            fill="#020712"
          />

          {/* Band label at top of dial */}
          {!isInsufficient && (
            <text
              x={center}
              y={size === 'small' ? 16 : 20}
              fill={bandColor}
              fontSize={size === 'small' ? 7 : 8}
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="0.08em"
            >
              {formatBandLabel(band)}
            </text>
          )}
        </svg>
      </div>

      {/* Label and band text below the dial */}
      {label && (
        <div className="axis-gauge-label">
          <div className={`axis-gauge-label-main${size === 'small' ? ' axis-gauge-label-main--small' : ''}`}>
            {label}
          </div>
          {!isInsufficient && (
            <div className={`axis-gauge-label-band axis-gauge-label-band--${bandModifier}`}>
              {formatBandLabel(band)}
            </div>
          )}
        </div>
      )}

      {/* Insufficient context pill */}
      {isInsufficient && (
        <div className="axis-gauge-insufficient-pill">
          NOT ENOUGH CONTEXT
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ARC PATH HELPER — Describes an SVG arc from startAngle to endAngle
// =============================================================================

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  // Convert angles to radians, offset by -90 so 0° is at top
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const startX = x + radius * Math.cos(startRad);
  const startY = y + radius * Math.sin(startRad);
  const endX = x + radius * Math.cos(endRad);
  const endY = y + radius * Math.sin(endRad);

  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweepFlag = endAngle > startAngle ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

export default AxisGauge;
