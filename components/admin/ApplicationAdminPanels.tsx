// =============================================================================
// APPLICATION ADMIN PANELS — Admin views for applications and bookings
// =============================================================================
// Reusable panels for viewing, filtering, and managing applications and calls.
// Used in both Platform Admin and Tenant Admin portals.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Target, FlaskConical, Calendar, Phone, Mail, Clock, User,
  CheckCircle, XCircle, Eye, ChevronDown, ChevronUp, Filter,
  AlertCircle, Loader2, Check, X
} from 'lucide-react';
import type { UserScope } from '../../types/multiTenant';
import type {
  CoachingApplicationV2,
  BetaApplicationV2,
  CoachingAiEvaluationV2,
  BetaAiEvaluationV2,
  Booking,
  TimeSlot,
} from '../../types/applicationTypes';
import {
  getAllCoachingApplicationsV2,
  getAllBetaApplicationsV2,
  updateCoachingApplicationStatusV2,
  updateBetaApplicationStatusV2,
  getCoachingApplicationByIdV2,
  getBetaApplicationByIdV2,
} from '../../stores/applicationStore';
import {
  getAllBookings,
  getPendingBookings,
  approveBooking,
  cancelBooking,
  getBookingsForApplication,
} from '../../stores/bookingStore';
import { formatSlotForDisplay } from '../../api/applicationApi';

const MotionDiv = motion.div as any;

// =============================================================================
// COACHING APPLICATIONS PANEL
// =============================================================================

interface CoachingApplicationsPanelProps {
  userScope: UserScope;
  tenantFilter?: string; // If provided, filter by tenant
}

export const CoachingApplicationsPanel: React.FC<CoachingApplicationsPanelProps> = ({
  userScope,
  tenantFilter,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const applications = useMemo(() => {
    let apps = getAllCoachingApplicationsV2();
    
    if (tenantFilter) {
      apps = apps.filter(a => a.tenantId === tenantFilter);
    }
    
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    
    if (minFitScore > 0) {
      apps = apps.filter(a => (a.aiEvaluation?.fitScore ?? 0) >= minFitScore);
    }
    
    return apps.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [tenantFilter, statusFilter, minFitScore]);
  
  return (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          >
            <option value="all">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="AI_EVALUATED">AI Evaluated</option>
            <option value="SCHEDULING_COMPLETE">Scheduling Complete</option>
            <option value="CALL_CONFIRMED">Call Confirmed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Min Fit Score:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minFitScore}
            onChange={(e) => setMinFitScore(parseInt(e.target.value) || 0)}
            className="w-16 text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          />
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* List */}
      <div className="divide-y divide-[#1A1A1D] max-h-[600px] overflow-y-auto">
        {applications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Target size={32} className="mx-auto mb-2 opacity-50" />
            <p>No coaching applications found</p>
          </div>
        ) : (
          applications.map(app => (
            <CoachingApplicationRow
              key={app.id}
              application={app}
              expanded={expandedId === app.id}
              onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
              userScope={userScope}
            />
          ))
        )}
      </div>
    </div>
  );
};

const CoachingApplicationRow: React.FC<{
  application: CoachingApplicationV2;
  expanded: boolean;
  onToggle: () => void;
  userScope: UserScope;
}> = ({ application, expanded, onToggle, userScope }) => {
  const ai = application.aiEvaluation;
  const bookings = useMemo(() => getBookingsForApplication(application.id), [application.id]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CALL_CONFIRMED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'REJECTED':
      case 'DECLINED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'AI_EVALUATED':
      case 'SCHEDULING_COMPLETE':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  return (
    <div className="border-b border-[#1A1A1D] last:border-b-0">
      {/* Header */}
      <div
        onClick={onToggle}
        className="p-4 hover:bg-[#1A1A1D] cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4433FF]/20 rounded-full flex items-center justify-center">
              <User size={16} className="text-[#4433FF]" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{application.form.name}</div>
              <div className="text-xs text-gray-500">{application.form.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ai && (
              <div className="flex items-center gap-2">
                <ScoreBadge label="Fit" score={ai.fitScore} />
                <ScoreBadge label="Money" score={ai.moneyReadinessScore} />
                <ScoreBadge label="Decision" score={ai.decisionPowerScore} />
              </div>
            )}
            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(application.status)}`}>
              {application.status.replace(/_/g, ' ')}
            </span>
            {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <MotionDiv
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4"
        >
          <div className="bg-[#1A1A1D] rounded-lg p-4 space-y-4">
            {/* Form Answers */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Application Answers</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Business:</span>
                  <p className="text-gray-300 mt-1">{application.form.businessModel}</p>
                </div>
                <div>
                  <span className="text-gray-500">Revenue:</span>
                  <p className="text-gray-300 mt-1">{application.form.currentMonthlyRevenue} → {application.form.targetMonthlyRevenue}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Frame Problems:</span>
                  <p className="text-gray-300 mt-1">{application.form.mainFrameProblems}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Why Now:</span>
                  <p className="text-gray-300 mt-1">{application.form.whyNow}</p>
                </div>
                <div>
                  <span className="text-gray-500">Decision Maker:</span>
                  <p className="text-gray-300 mt-1">{application.form.decisionMakerStatus}</p>
                </div>
                <div>
                  <span className="text-gray-500">Budget:</span>
                  <p className="text-gray-300 mt-1">{application.form.budgetReadiness}</p>
                </div>
              </div>
            </div>
            
            {/* AI Evaluation */}
            {ai && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">AI Evaluation</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      ai.recommendedOutcome === 'ACCEPT_HIGH_TICKET_CALL' ? 'bg-green-500/20 text-green-400' :
                      ai.recommendedOutcome === 'REJECT_NOT_A_FIT' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {ai.recommendedOutcome}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{ai.coachBriefing}</p>
                  {ai.flags && ai.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ai.flags.map((flag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded">
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                  {ai.callFocus && ai.callFocus.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Call Focus:</span>
                      <ul className="mt-1 space-y-1">
                        {ai.callFocus.map((item, i) => (
                          <li key={i} className="text-xs text-gray-300">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bookings */}
            {bookings.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Proposed Call Times</h4>
                <div className="space-y-2">
                  {bookings.map(booking => (
                    <BookingRow key={booking.id} booking={booking} userScope={userScope} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </MotionDiv>
      )}
    </div>
  );
};

// =============================================================================
// BETA APPLICATIONS PANEL
// =============================================================================

interface BetaApplicationsPanelProps {
  userScope: UserScope;
  tenantFilter?: string;
}

export const BetaApplicationsPanel: React.FC<BetaApplicationsPanelProps> = ({
  userScope,
  tenantFilter,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const applications = useMemo(() => {
    let apps = getAllBetaApplicationsV2();
    
    if (tenantFilter) {
      apps = apps.filter(a => a.tenantId === tenantFilter);
    }
    
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    
    if (minFitScore > 0) {
      apps = apps.filter(a => (a.aiEvaluation?.betaFitScore ?? 0) >= minFitScore);
    }
    
    return apps.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [tenantFilter, statusFilter, minFitScore]);
  
  return (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          >
            <option value="all">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="AI_EVALUATED">AI Evaluated</option>
            <option value="SCHEDULING_COMPLETE">Scheduling Complete</option>
            <option value="CALL_CONFIRMED">Call Confirmed</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Min Fit Score:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minFitScore}
            onChange={(e) => setMinFitScore(parseInt(e.target.value) || 0)}
            className="w-16 text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          />
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* List */}
      <div className="divide-y divide-[#1A1A1D] max-h-[600px] overflow-y-auto">
        {applications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FlaskConical size={32} className="mx-auto mb-2 opacity-50" />
            <p>No beta applications found</p>
          </div>
        ) : (
          applications.map(app => (
            <BetaApplicationRow
              key={app.id}
              application={app}
              expanded={expandedId === app.id}
              onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
              userScope={userScope}
            />
          ))
        )}
      </div>
    </div>
  );
};

const BetaApplicationRow: React.FC<{
  application: BetaApplicationV2;
  expanded: boolean;
  onToggle: () => void;
  userScope: UserScope;
}> = ({ application, expanded, onToggle, userScope }) => {
  const ai = application.aiEvaluation;
  const bookings = useMemo(() => getBookingsForApplication(application.id), [application.id]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CALL_CONFIRMED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DECLINED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  return (
    <div className="border-b border-[#1A1A1D] last:border-b-0">
      {/* Header */}
      <div
        onClick={onToggle}
        className="p-4 hover:bg-[#1A1A1D] cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <User size={16} className="text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{application.form.name}</div>
              <div className="text-xs text-gray-500">{application.form.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ai && (
              <div className="flex items-center gap-2">
                <ScoreBadge label="Fit" score={ai.betaFitScore} color="green" />
                <ScoreBadge label="Engage" score={ai.expectedEngagementScore} color="green" />
                <ScoreBadge label="Churn" score={ai.riskOfChurnScore} color="red" inverted />
              </div>
            )}
            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(application.status)}`}>
              {application.status.replace(/_/g, ' ')}
            </span>
            {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <MotionDiv
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4"
        >
          <div className="bg-[#1A1A1D] rounded-lg p-4 space-y-4">
            {/* Form Answers */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Application Answers</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Role:</span>
                  <p className="text-gray-300 mt-1">{application.form.role || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Expected Usage:</span>
                  <p className="text-gray-300 mt-1">{application.form.expectedSessionsPerWeek} sessions/week</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Reason for Beta:</span>
                  <p className="text-gray-300 mt-1">{application.form.reasonForBeta}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Usage Intent:</span>
                  <p className="text-gray-300 mt-1">{application.form.usageIntent}</p>
                </div>
              </div>
            </div>
            
            {/* AI Evaluation */}
            {ai && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">AI Evaluation</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      ai.accept ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {ai.tier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{ai.productOwnerNote}</p>
                  {ai.followUpQuestions && ai.followUpQuestions.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Follow-up Questions:</span>
                      <ul className="mt-1 space-y-1">
                        {ai.followUpQuestions.map((q, i) => (
                          <li key={i} className="text-xs text-gray-300">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bookings */}
            {bookings.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Proposed Call Times</h4>
                <div className="space-y-2">
                  {bookings.map(booking => (
                    <BookingRow key={booking.id} booking={booking} userScope={userScope} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </MotionDiv>
      )}
    </div>
  );
};

// =============================================================================
// PENDING CALLS PANEL
// =============================================================================

interface PendingCallsPanelProps {
  userScope: UserScope;
  tenantFilter?: string;
}

export const PendingCallsPanel: React.FC<PendingCallsPanelProps> = ({
  userScope,
  tenantFilter,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const pendingBookings = useMemo(() => {
    let bookings = getPendingBookings();
    if (tenantFilter) {
      bookings = bookings.filter(b => b.tenantId === tenantFilter);
    }
    return bookings.sort((a, b) => 
      new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime()
    );
  }, [tenantFilter, refreshKey]);
  
  // Group by application
  type ApplicationGroup = { applicant: string; bookings: Booking[] };
  const groupedByApplication = useMemo((): Record<string, ApplicationGroup> => {
    const groups: Record<string, ApplicationGroup> = {};
    
    for (const booking of pendingBookings) {
      if (!groups[booking.applicationId]) {
        // Get applicant name
        const coachingApp = getCoachingApplicationByIdV2(booking.applicationId);
        const betaApp = getBetaApplicationByIdV2(booking.applicationId);
        const applicant = coachingApp?.form.name || betaApp?.form.name || 'Unknown';
        
        groups[booking.applicationId] = { applicant, bookings: [] };
      }
      groups[booking.applicationId].bookings.push(booking);
    }
    
    return groups;
  }, [pendingBookings]);
  
  const handleApprove = (bookingId: string) => {
    approveBooking(bookingId);
    setRefreshKey(k => k + 1);
  };
  
  const handleCancel = (bookingId: string) => {
    cancelBooking(bookingId);
    setRefreshKey(k => k + 1);
  };
  
  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">
          Pending Call Approvals ({pendingBookings.length} slot{pendingBookings.length !== 1 ? 's' : ''})
        </h3>
      </div>
      
      <div className="divide-y divide-[#1A1A1D] max-h-[600px] overflow-y-auto">
        {Object.keys(groupedByApplication).length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p>No pending call approvals</p>
          </div>
        ) : (
          Object.keys(groupedByApplication).map((appId) => {
            const group = groupedByApplication[appId];
            return (
              <div key={appId} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-gray-500" />
                  <span className="text-sm font-medium text-white">{group.applicant}</span>
                  <span className="text-xs text-gray-500">
                    ({group.bookings[0].bookingType === 'COACHING' ? '45 min coaching' : '10 min beta'})
                  </span>
                </div>
                <div className="space-y-2">
                  {group.bookings.map(booking => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-gray-500" />
                        <span className="text-sm text-white">
                          {formatSlotForDisplay(booking.slot)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                        >
                          <X size={12} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {group.bookings[0].phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {group.bookings[0].email}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ScoreBadge: React.FC<{
  label: string;
  score: number;
  color?: 'blue' | 'green' | 'red';
  inverted?: boolean;
}> = ({ label, score, color = 'blue', inverted = false }) => {
  const displayScore = inverted ? 100 - score : score;
  const isGood = inverted ? score < 40 : score >= 60;
  const isBad = inverted ? score >= 60 : score < 40;
  
  return (
    <div className="text-center">
      <div className={`text-xs font-bold ${
        isGood ? 'text-green-400' : isBad ? 'text-red-400' : 'text-yellow-400'
      }`}>
        {score}
      </div>
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
    </div>
  );
};

const BookingRow: React.FC<{
  booking: Booking;
  userScope: UserScope;
}> = ({ booking, userScope }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/20 text-green-400';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-500/20 text-red-400';
      case 'SUPERSEDED':
        return 'bg-gray-500/20 text-gray-500';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };
  
  return (
    <div className="flex items-center justify-between p-2 bg-[#0E0E0E] rounded">
      <div className="flex items-center gap-2">
        <Calendar size={12} className="text-gray-500" />
        <span className="text-xs text-gray-300">
          {formatSlotForDisplay(booking.slot)}
        </span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(booking.status)}`}>
        {booking.status}
      </span>
    </div>
  );
};

export default {
  CoachingApplicationsPanel,
  BetaApplicationsPanel,
  PendingCallsPanel,
};

