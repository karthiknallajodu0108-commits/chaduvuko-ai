import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Sparkles,
  FileSearch,
  Target,
  FileEdit,
  Mail,
  MessageSquareText,
  Compass,
  Briefcase,
  Settings,
  Menu,
  X,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { CareerPilotLogo } from './CareerPilotLogo';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { OverviewView } from '../pages/OverviewView';
import { AiAssistantView } from '../pages/AiAssistantView';
import { ResumeAnalyzerView } from '../pages/ResumeAnalyzerView';
import { JobMatcherView } from '../pages/JobMatcherView';
import { ResumeTailorView } from '../pages/ResumeTailorView';
import { CoverLettersView } from '../pages/CoverLettersView';
import { InterviewCoachView } from '../pages/InterviewCoachView';
import { CareerRoadmapView } from '../pages/CareerRoadmapView';
import { ApplicationsView } from '../pages/ApplicationsView';
import { SettingsView } from '../pages/SettingsView';

export type WorkspaceTab =
  | 'overview'
  | 'ai-assistant'
  | 'resume-analyzer'
  | 'job-matcher'
  | 'resume-tailor'
  | 'cover-letters'
  | 'interview-coach'
  | 'career-roadmap'
  | 'applications'
  | 'settings';

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'resume-analyzer', label: 'Resume Analyzer', icon: FileSearch },
  { id: 'job-matcher', label: 'Job Matcher', icon: Target },
  { id: 'resume-tailor', label: 'Resume Tailor', icon: FileEdit },
  { id: 'cover-letters', label: 'Cover Letters', icon: Mail },
  { id: 'interview-coach', label: 'Interview Coach', icon: MessageSquareText },
  { id: 'career-roadmap', label: 'Career Roadmap', icon: Compass },
  { id: 'applications', label: 'Applications', icon: Briefcase },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface DashboardShellProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onExitToLanding: () => void;
}

export function DashboardShell({
  activeTab,
  onTabChange,
  onExitToLanding,
}: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  const handleSelectTab = (tab: WorkspaceTab) => {
    onTabChange(tab);
    setMobileNavOpen(false);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView onNavigate={handleSelectTab} />;
      case 'ai-assistant':
        return <AiAssistantView />;
      case 'resume-analyzer':
        return <ResumeAnalyzerView />;
      case 'job-matcher':
        return <JobMatcherView />;
      case 'resume-tailor':
        return <ResumeTailorView />;
      case 'cover-letters':
        return <CoverLettersView />;
      case 'interview-coach':
        return <InterviewCoachView />;
      case 'career-roadmap':
        return <CareerRoadmapView />;
      case 'applications':
        return <ApplicationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView onNavigate={handleSelectTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033] flex">
      {/* Desktop Dark Navy Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#101828] text-slate-300 border-r border-white/10 z-30">
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <button
            type="button"
            onClick={onExitToLanding}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EE7B7] rounded-lg"
          >
            <CareerPilotLogo variant="light" size="sm" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#142033] text-white border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#6EE7B7]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-1">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Account avatar'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#142033] border border-white/20 flex items-center justify-center text-xs font-bold text-[#6EE7B7] shrink-0">
                {(user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.displayName || 'CHADHUVUKO Member'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExitToLanding}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-68 max-w-[82vw] h-full bg-[#101828] text-slate-300 flex flex-col"
            >
              <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
                <CareerPilotLogo variant="light" size="sm" />
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        active ? 'bg-[#142033] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#6EE7B7]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <button
                  type="button"
                  onClick={onExitToLanding}
                  className="flex-1 py-2 text-xs text-slate-300 bg-white/5 rounded-lg"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex-1 py-2 text-xs text-slate-300 bg-white/5 rounded-lg"
                >
                  Sign out
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 h-16 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open workspace navigation"
              className="lg:hidden p-2 text-[#172033] hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#64748B] hidden sm:inline">CHADHUVUKO</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-display font-bold text-[#101828] truncate">
                {currentNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab !== 'ai-assistant' && (
              <button
                type="button"
                onClick={() => handleSelectTab('ai-assistant')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6EE7B7]" />
                <span>Ask AI Assistant</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary resetKey={activeTab}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
