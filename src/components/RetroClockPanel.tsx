import React, { useEffect, useRef } from 'react';

interface RetroClockPanelProps {
  time: Date;
  userLocation?: {
    city: string;
    country: string;
    timezone: string;
  } | null;
}

const GIF_SIZE = 240; // Larger GIF size to match reference

export const RetroClockPanel: React.FC<RetroClockPanelProps> = ({ time, userLocation }) => {
  const noiseRef = useRef<HTMLCanvasElement>(null);

  // Format time into HH:MM and AM/PM
  const getTimeParts = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: userLocation?.timezone || undefined,
    };

    try {
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(time);
      const hour = parts.find((p) => p.type === 'hour')?.value || '00';
      const minute = parts.find((p) => p.type === 'minute')?.value || '00';
      const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value || '';
      return { hour, minute, period: dayPeriod.toUpperCase() };
    } catch {
      const fallback = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(time);
      const hour = fallback.find((p) => p.type === 'hour')?.value || '00';
      const minute = fallback.find((p) => p.type === 'minute')?.value || '00';
      const dayPeriod = fallback.find((p) => p.type === 'dayPeriod')?.value || '';
      return { hour, minute, period: dayPeriod.toUpperCase() };
    }
  };

  // Format temperature (Fahrenheit for US users)
  const getTemperature = () => {
    return '64°F'; // TODO: Get real temperature from location API
  };

  // Format timezone
  const getTimezone = () => {
    return userLocation?.timezone.split('/')[0] || 'UTC-3';
  };

  // Full-card TV static noise background
  useEffect(() => {
    const canvas = noiseRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full size of parent container
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    let frameId: number;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Skip drawing if canvas has no dimensions yet
      if (width <= 0 || height <= 0) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 100; // Opacity for TV static effect
      }

      ctx.putImageData(imageData, 0, 0);
      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Format day of week
  const getDayOfWeek = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      timeZone: userLocation?.timezone || undefined,
    };
    try {
      return new Intl.DateTimeFormat('en-US', options).format(time).toUpperCase();
    } catch {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(time).toUpperCase();
    }
  };

  // Format full date
  const getFullDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: userLocation?.timezone || undefined,
    };
    try {
      return new Intl.DateTimeFormat('en-US', options).format(time).toUpperCase();
    } catch {
      return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(time).toUpperCase();
    }
  };

  const { hour, minute, period } = getTimeParts();
  const temperature = getTemperature();
  const timezone = getTimezone();
  const dayOfWeek = getDayOfWeek();
  const fullDate = getFullDate();
  const locationText = userLocation
    ? `${userLocation.city.toUpperCase()}, ${userLocation.country.toUpperCase()}`
    : 'BUENOS AIRES, ARGENTINA';

  return (
    <div className="rounded-xl p-6 text-white shadow-lg relative overflow-hidden right-panel-framelord">
      {/* Full-card TV Static noise background */}
      <canvas
        ref={noiseRef}
        className="absolute inset-0 opacity-25 rounded-xl"
        style={{
          width: '100%',
          height: '100%',
          mixBlendMode: 'screen',
          zIndex: 0,
        }}
      />

      {/* Content layer - on top of static */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top row: Day and Date */}
        <div className="flex items-start justify-between mb-4 text-[10px] font-mono tracking-wider text-gray-400">
          <div>{dayOfWeek}</div>
          <div>{fullDate}</div>
        </div>

        {/* Center: Large GIF with overlaid time - vertically centered */}
        <div className="flex flex-col items-center justify-center mb-4 flex-1">
          <div className="relative" style={{ width: GIF_SIZE, height: GIF_SIZE }}>
            {/* Retro PC GIF layer */}
            <img
              src="/pc_blueprint.gif"
              alt="Retro PC"
              className="absolute inset-0"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
            {/* Time display - Overlaid on top of GIF */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="text-5xl font-bold leading-none tracking-tight text-white whitespace-nowrap"
                style={{
                  fontFamily: 'Impact, "Arial Black", sans-serif',
                  textShadow: '0 0 30px rgba(0, 0, 0, 0.9), 0 0 60px rgba(68, 136, 255, 0.6)',
                  WebkitTextStroke: '1px rgba(0, 0, 0, 0.5)',
                }}
              >
                {hour}:{minute} {period}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Temperature/Location and Timezone */}
        <div className="flex items-end justify-between text-[10px] font-mono tracking-wider text-gray-400">
          <div className="flex items-center gap-2">
            <span>{temperature}</span>
            <span>{locationText}</span>
          </div>
          <div>{timezone}</div>
        </div>
      </div>
    </div>
  );
};
