// =============================================================================
// FRAMESCAN GAUGE — SVG gauge with red/yellow/green color bands
// =============================================================================
// Displays a -3 to +3 score with fixed color band arc segments:
// - Red segment: -3 to -1 (slave/low frame)
// - Yellow segment: -1 to +1 (mixed/caution)
// - Green segment: +1 to +3 (apex/strong frame)
// Needle animates to indicate current score position.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import type { FrameBand } from '../../lib/frameScan/frameTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface FrameScanGaugeProps {
  label: string;
  score: number | null;  // -3 to +3, null = insufficient context
  band: FrameBand;
  size?: number;         // diameter in pixels, default 140
  showScore?: boolean;   // show numeric score below gauge
  hasData?: boolean;     // explicit flag for data availability
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN = -3;
const MAX = 3;
const START_ANGLE = -120;
const END_ANGLE = 120;

// Color band segment colors
const SEGMENT_COLORS = {
  red: '#ff4b6a',     // Slave/low frame
  yellow: '#ffbf3b',  // Mixed/caution
  green: '#2dff91',   // Apex/strong frame
};

// Band to needle color mapping
const BAND_NEEDLE_COLORS: Record<FrameBand, string> = {
  strong_slave: '#ff4b6a',
  mild_slave: '#ffbf3b',
  neutral: '#8fd2ff',
  mild_apex: '#2dff91',
  strong_apex: '#2dff91',
};

// =============================================================================
// GEOMETRY UTILITIES
// =============================================================================

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI / 180) * (angleDeg - 90);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startPt = polarToCartesian(cx, cy, r, endAngle);
  const endPt = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return [
    'M', startPt.x, startPt.y,
    'A', r, r, 0, largeArcFlag, 0, endPt.x, endPt.y,
  ].join(' ');
}

function valueToAngle(value: number): number {
  const t = (value - MIN) / (MAX - MIN);
  return START_ANGLE + t * (END_ANGLE - START_ANGLE);
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameScanGauge: React.FC<FrameScanGaugeProps> = ({
  label,
  score,
  band,
  size = 140,
  showScore = true,
  hasData,
}) => {
  const center = size / 2;
  const radius = size * 0.36;       // Arc radius
  const thickness = size * 0.055;   // Stroke width
  const needleLength = radius - 4;
  // Use explicit hasData prop if provided, otherwise infer from score
  const isInsufficient = hasData !== undefined ? !hasData : score === null;

  // Calculate needle angle
  const needleAngle = score !== null
    ? valueToAngle(Math.max(MIN, Math.min(MAX, score)))
    : 0;

  // Segment angle ranges
  const seg1Start = valueToAngle(-3);
  const seg1End = valueToAngle(-1);
  const seg2Start = valueToAngle(-1);
  const seg2End = valueToAngle(1);
  const seg3Start = valueToAngle(1);
  const seg3End = valueToAngle(3);

  // Needle color based on band
  const needleColor = BAND_NEEDLE_COLORS[band];

  // Generate tick marks at -3, -2, -1, 0, 1, 2, 3
  const ticks = [-3, -2, -1, 0, 1, 2, 3];

  // Unique ID for this gauge (for gradients/filters)
  const gaugeId = `fsg-${label.replace(/\s+/g, '-').toLowerCase()}-${size}`;

  return (
    <div className="framescan-gauge-container">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`framescan-gauge-svg${isInsufficient ? ' framescan-gauge-svg--insufficient' : ''}`}
      >
        {/* Definitions */}
        <defs>
          {/* Glow filter for needle */}
          <filter id={`${gaugeId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial gradient for dial face */}
          <radialGradient id={`${gaugeId}-bg`} cx="50%" cy="60%" r="80%">
            <stop offset="0%" stopColor="rgba(20, 40, 70, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={center - 2}
          fill={`url(#${gaugeId}-bg)`}
        />

        {/* Outer chrome ring */}
        <circle
          cx={center}
          cy={center}
          r={center - 3}
          fill="none"
          stroke="rgba(143, 227, 255, 0.3)"
          strokeWidth="1"
        />

        {/* Background dim arc */}
        <path
          d={describeArc(center, center, radius, START_ANGLE, END_ANGLE)}
          stroke="rgba(70, 120, 160, 0.25)"
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
        />

        {/* Red segment: -3 to -1 (Slave) */}
        <path
          d={describeArc(center, center, radius, seg1Start, seg1End)}
          stroke={SEGMENT_COLORS.red}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          opacity={isInsufficient ? 0.3 : 0.9}
        />

        {/* Yellow segment: -1 to +1 (Mixed) */}
        <path
          d={describeArc(center, center, radius, seg2Start, seg2End)}
          stroke={SEGMENT_COLORS.yellow}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          opacity={isInsufficient ? 0.3 : 0.9}
        />

        {/* Green segment: +1 to +3 (Apex) */}
        <path
          d={describeArc(center, center, radius, seg3Start, seg3End)}
          stroke={SEGMENT_COLORS.green}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          opacity={isInsufficient ? 0.3 : 0.9}
        />

        {/* Tick marks */}
        {ticks.map((tickValue) => {
          const tickAngle = valueToAngle(tickValue);
          const angleRad = (tickAngle - 90) * (Math.PI / 180);
          const isMajor = tickValue === 0 || Math.abs(tickValue) === 3;
          const tickInner = radius + thickness / 2 + 2;
          const tickOuter = tickInner + (isMajor ? 8 : 5);

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
              stroke={isMajor ? 'rgba(154, 209, 255, 0.9)' : 'rgba(132, 223, 255, 0.5)'}
              strokeWidth={isMajor ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Tick labels for -3, 0, +3 */}
        {[-3, 0, 3].map((tickValue) => {
          const tickAngle = valueToAngle(tickValue);
          const angleRad = (tickAngle - 90) * (Math.PI / 180);
          const labelRadius = radius + thickness / 2 + 18;
          const x = center + labelRadius * Math.cos(angleRad);
          const y = center + labelRadius * Math.sin(angleRad);

          return (
            <text
              key={`label-${tickValue}`}
              x={x}
              y={y}
              fill="rgba(154, 209, 255, 0.8)"
              fontSize={size > 100 ? 11 : 9}
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {tickValue > 0 ? `+${tickValue}` : tickValue}
            </text>
          );
        })}

        {/* Needle with animation */}
        {!isInsufficient && (
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: needleAngle }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          >
            {/* Needle line */}
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - needleLength}
              stroke={needleColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter={`url(#${gaugeId}-glow)`}
            />
            {/* Needle tip */}
            <circle
              cx={center}
              cy={center - needleLength + 2}
              r="3"
              fill={needleColor}
              filter={`url(#${gaugeId}-glow)`}
            />
          </motion.g>
        )}

        {/* Center pivot */}
        <circle
          cx={center}
          cy={center}
          r={6}
          fill="#5fe0ff"
          filter={`url(#${gaugeId}-glow)`}
        />
        <circle
          cx={center}
          cy={center}
          r={3}
          fill="#020712"
        />

        {/* Score display at bottom of dial */}
        {showScore && score !== null && (
          <g>
            {/* Score background pill */}
            <rect
              x={center - 22}
              y={center + radius * 0.45}
              width={44}
              height={20}
              rx={4}
              fill="rgba(5, 12, 24, 0.9)"
              stroke="rgba(95, 224, 255, 0.4)"
              strokeWidth={1}
            />
            {/* Score text */}
            <text
              x={center}
              y={center + radius * 0.45 + 12}
              fill="#5fe0ff"
              fontSize={12}
              fontWeight="700"
              fontFamily="'SF Mono', ui-monospace, monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {score >= 0 ? score.toFixed(2) : score.toFixed(2)}
            </text>
          </g>
        )}
      </svg>

      {/* Label below gauge */}
      {label && (
        <div className="framescan-gauge-label">
          {label}
        </div>
      )}

      {/* Insufficient context indicator */}
      {isInsufficient && (
        <div className="framescan-gauge-insufficient">
          NO DATA
        </div>
      )}
    </div>
  );
};

export default FrameScanGauge;
