// =============================================================================
// APPLICATION ADMIN PANELS — Admin views for applications and bookings
// =============================================================================
// Reusable panels for viewing, filtering, and managing applications and calls.
// Used in both Platform Admin and Tenant Admin portals.
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
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
  getAllBetaChatApplications,
  approveBetaApplication,
  markNeedsCaseCall,
  rejectBetaApplication,
  type BetaChatApplication,
  type BetaChatApplicationStatus,
} from '../../stores/betaChatApplicationStore';
import {
  getAllCaseCallApplications,
  updateCaseCallApplicationStatus,
  markCaseCallScheduled,
  type CaseCallApplication,
  type CaseCallApplicationStatus,
} from '../../stores/caseCallApplicationStore';
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
  const [sourceFilter, setSourceFilter] = useState<'all' | 'chat' | 'form'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatApplications, setChatApplications] = useState<BetaChatApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get both chat-based and form-based beta applications
  useEffect(() => {
    setIsLoading(true);
    getAllBetaChatApplications()
      .then(setChatApplications)
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const formApplications = useMemo(() => getAllBetaApplicationsV2(), [refreshKey]);

  // Filter chat applications
  const filteredChatApps = useMemo(() => {
    if (sourceFilter === 'form') return [];
    let apps = chatApplications;
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    return apps;
  }, [chatApplications, statusFilter, sourceFilter]);

  // Filter form applications
  const filteredFormApps = useMemo(() => {
    if (sourceFilter === 'chat') return [];
    let apps = formApplications;
    if (tenantFilter) {
      apps = apps.filter(a => a.tenantId === tenantFilter);
    }
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    return apps;
  }, [formApplications, tenantFilter, statusFilter, sourceFilter]);

  const totalCount = filteredChatApps.length + filteredFormApps.length;

  const handleChatStatusChange = async (id: string, action: 'approve' | 'reject' | 'needs_case_call') => {
    switch (action) {
      case 'approve':
        await approveBetaApplication(id, userScope.userId);
        break;
      case 'reject':
        await rejectBetaApplication(id, userScope.userId);
        break;
      case 'needs_case_call':
        await markNeedsCaseCall(id, userScope.userId);
        break;
    }
    setRefreshKey(k => k + 1);
  };

  return (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | 'chat' | 'form')}
            className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          >
            <option value="all">All Sources</option>
            <option value="chat">Chat Applications</option>
            <option value="form">Form Applications</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied (Chat)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_case_call">Needs Case Call</option>
            <option value="SUBMITTED">Submitted (Form)</option>
            <option value="AI_EVALUATED">AI Evaluated</option>
          </select>
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {totalCount} application{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Chat Applications Section */}
      {filteredChatApps.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-[#1A1A1D] text-xs text-gray-400 font-bold uppercase">
            Chat Applications ({filteredChatApps.length})
          </div>
          <div className="divide-y divide-[#1A1A1D]">
            {filteredChatApps.map(app => (
              <BetaChatApplicationRow
                key={app.id}
                application={app}
                expanded={expandedId === app.id}
                onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                onStatusChange={handleChatStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Form Applications Section */}
      {filteredFormApps.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-[#1A1A1D] text-xs text-gray-400 font-bold uppercase">
            Form Applications ({filteredFormApps.length})
          </div>
          <div className="divide-y divide-[#1A1A1D]">
            {filteredFormApps.map(app => (
              <BetaApplicationRow
                key={app.id}
                application={app}
                expanded={expandedId === app.id}
                onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                userScope={userScope}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="p-6 text-center text-gray-500">
          <FlaskConical size={32} className="mx-auto mb-2 opacity-50" />
          <p>No beta applications found</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BETA CHAT APPLICATION ROW
// =============================================================================

const BetaChatApplicationRow: React.FC<{
  application: BetaChatApplication;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, action: 'approve' | 'reject' | 'needs_case_call') => void;
}> = ({ application, expanded, onToggle, onStatusChange }) => {

  const getStatusColor = (status: BetaChatApplicationStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'needs_case_call':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
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
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <User size={16} className="text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{application.name}</div>
              <div className="text-xs text-gray-500">{application.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
              Chat
            </span>
            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(application.status)}`}>
              {application.status.replace(/_/g, ' ')}
            </span>
            {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Submitted: {new Date(application.createdAt).toLocaleString()}
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
            {/* Conversation History */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Conversation History</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {application.conversationHistory.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    msg.role === 'ai'
                      ? 'bg-[#0E0E0E] border-l-2 border-purple-500'
                      : 'bg-[#2A2A2A] border-l-2 border-blue-500'
                  }`}>
                    <div className="text-xs text-gray-500 mb-1 uppercase font-bold">
                      {msg.role === 'ai' ? 'Director' : 'Applicant'}
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {application.status === 'applied' && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'approve'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Approve & Create Account
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'needs_case_call'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-colors"
                  >
                    <Phone size={14} />
                    Needs Case Call
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'reject'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Review Info */}
            {application.reviewedAt && (
              <div className="text-xs text-gray-500">
                Reviewed: {new Date(application.reviewedAt).toLocaleString()}
                {application.notes && <div className="mt-1 text-gray-400">Notes: {application.notes}</div>}
              </div>
            )}
          </div>
        </MotionDiv>
      )}
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
// CASE CALL APPLICATIONS PANEL
// =============================================================================

interface CaseCallApplicationsPanelProps {
  userScope: UserScope;
}

export const CaseCallApplicationsPanel: React.FC<CaseCallApplicationsPanelProps> = ({
  userScope,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allApplications, setAllApplications] = useState<CaseCallApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAllCaseCallApplications()
      .then(setAllApplications)
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const applications = useMemo(() => {
    let apps = [...allApplications];
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    return apps.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [statusFilter, allApplications]);

  const handleStatusChange = async (id: string, newStatus: CaseCallApplicationStatus) => {
    await updateCaseCallApplicationStatus(id, newStatus);
    setRefreshKey(k => k + 1);
  };

  const handleMarkScheduled = async (id: string) => {
    await markCaseCallScheduled(id);
    setRefreshKey(k => k + 1);
  };

  const getStatusColor = (status: CaseCallApplicationStatus) => {
    switch (status) {
      case 'scheduled':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'reviewed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

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
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#1A1A1D] max-h-[600px] overflow-y-auto">
        {applications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Phone size={32} className="mx-auto mb-2 opacity-50" />
            <p>No case call applications found</p>
          </div>
        ) : (
          applications.map(app => (
            <CaseCallApplicationRow
              key={app.id}
              application={app}
              expanded={expandedId === app.id}
              onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
              onStatusChange={handleStatusChange}
              onMarkScheduled={handleMarkScheduled}
              getStatusColor={getStatusColor}
            />
          ))
        )}
      </div>
    </div>
  );
};

const CaseCallApplicationRow: React.FC<{
  application: CaseCallApplication;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: CaseCallApplicationStatus) => void;
  onMarkScheduled: (id: string) => void;
  getStatusColor: (status: CaseCallApplicationStatus) => string;
}> = ({ application, expanded, onToggle, onStatusChange, onMarkScheduled, getStatusColor }) => {
  return (
    <div className="border-b border-[#1A1A1D] last:border-b-0">
      {/* Header */}
      <div
        onClick={onToggle}
        className="p-4 hover:bg-[#1A1A1D] cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Phone size={16} className="text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{application.name}</div>
              <div className="text-xs text-gray-500">{application.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(application.status)}`}>
              {application.status}
            </span>
            {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>Submitted: {new Date(application.createdAt).toLocaleString()}</span>
          {application.phone && (
            <span className="flex items-center gap-1">
              <Phone size={10} />
              {application.phone}
            </span>
          )}
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
            {/* Application Answers */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Application Answers</h4>
              <div className="space-y-4">
                {application.answers.map((qa, idx) => (
                  <div key={idx}>
                    <div className="text-xs text-gray-500 mb-1">{qa.question}</div>
                    <p className="text-sm text-gray-300 leading-relaxed">{qa.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {application.notes && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-300">{application.notes}</p>
              </div>
            )}

            {/* Scheduling Info */}
            {application.scheduledAt && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <Calendar size={12} />
                Scheduled: {new Date(application.scheduledAt).toLocaleString()}
              </div>
            )}

            {/* Actions */}
            {application.status === 'submitted' && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'reviewed'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-colors"
                  >
                    <Eye size={14} />
                    Mark Reviewed
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkScheduled(application.id); }}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                  >
                    <Calendar size={14} />
                    Mark Scheduled
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'cancelled'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {application.status === 'reviewed' && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkScheduled(application.id); }}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                  >
                    <Calendar size={14} />
                    Mark Scheduled
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'cancelled'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {application.status === 'scheduled' && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'completed'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Mark Completed
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(application.id, 'cancelled'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Review timestamp */}
            {application.reviewedAt && (
              <div className="text-xs text-gray-500">
                Reviewed: {new Date(application.reviewedAt).toLocaleString()}
              </div>
            )}
          </div>
        </MotionDiv>
      )}
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
  CaseCallApplicationsPanel,
};

