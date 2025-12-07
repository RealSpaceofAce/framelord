// =============================================================================
// FRAMELORD NOTES SIDEBAR SKIN
// =============================================================================
// Wrapper component that applies FrameScan machine aesthetic to Notes sidebar.
// - Navy-black gradient background
// - Grid overlay texture
// - Glass effect with backdrop blur
// - Neon blue accent borders
// - Hard override for all theme modes (always dark machine aesthetic)
// =============================================================================

import React from 'react';
import './FrameLordNotesSidebarSkin.css';
import { SidebarParticles } from './SidebarParticles';

interface FrameLordNotesSidebarSkinProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that applies FrameScan machine skin to sidebar content.
 * Wrap the existing sidebar content in this component to apply the aesthetic.
 */
export const FrameLordNotesSidebarSkin: React.FC<FrameLordNotesSidebarSkinProps> = ({
  children,
}) => {
  return (
    <div className="notes-sidebar-framelord">
      {/* Particle layer - behind content, on top of grid */}
      <SidebarParticles />
      {children}
    </div>
  );
};

export default FrameLordNotesSidebarSkin;
