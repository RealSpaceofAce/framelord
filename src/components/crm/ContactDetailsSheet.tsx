// =============================================================================
// CONTACT DETAILS SHEET — Side drawer for viewing contact details
// =============================================================================
// A slide-in sheet that displays ContactDetailsCard content.
// Used in ContactZeroView and ContactDossierView for on-demand access.
// =============================================================================

import React from 'react';
import { User, Edit2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import { ContactDetailsCard } from './ContactDetailsCard';
import { getContactById } from '@/services/contactStore';

interface ContactDetailsSheetProps {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
}

/**
 * Contact Details Sheet
 *
 * A right-side sheet that displays contact details in a slide-out panel.
 * Much cleaner than inline cards that take up vertical space.
 */
export const ContactDetailsSheet: React.FC<ContactDetailsSheetProps> = ({
  contactId,
  open,
  onOpenChange,
  onEditClick,
}) => {
  const contact = getContactById(contactId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] sm:max-w-[420px] bg-[#0a0f18] border-l border-[#1b2c45] p-0 overflow-y-auto"
      >
        {/* Custom Header */}
        <SheetHeader className="sticky top-0 z-10 bg-[#0a0f18]/95 backdrop-blur-sm border-b border-[#1b2c45] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {contact?.avatarUrl ? (
                <img
                  src={contact.avatarUrl}
                  alt={contact.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-[#1b2c45]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#112035] border border-[#1b2c45] flex items-center justify-center">
                  <User size={18} className="text-gray-500" />
                </div>
              )}
              <div>
                <SheetTitle className="text-base font-medium text-white">
                  {contact?.fullName || 'Contact'}
                </SheetTitle>
                {contact?.relationshipRole && (
                  <p className="text-xs text-gray-500">{contact.relationshipRole}</p>
                )}
              </div>
            </div>
            {onEditClick && (
              <button
                onClick={onEditClick}
                className="p-2 rounded-lg hover:bg-[#112035] transition-colors text-gray-400 hover:text-white"
                title="Edit contact"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-4">
          <ContactDetailsCard
            contactId={contactId}
            onExpandClick={onEditClick}
            onRefresh={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailsSheet;
