import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CinematicIntro } from './components/CinematicIntro';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { DashboardShell, type WorkspaceTab } from './components/DashboardShell';

const VALID_TABS: WorkspaceTab[] = [
  'overview',
  'ai-assistant',
  'resume-analyzer',
  'job-matcher',
  'resume-tailor',
  'cover-letters',
  'interview-coach',
  'career-roadmap',
  'applications',
  'settings',
];

function AppContent() {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cp_intro_seen') !== '1';
    } catch {
      return true;
    }
  });
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [pendingTab, setPendingTab] = useState<WorkspaceTab | null>(null);

  // When user signs in while waiting to enter the dashboard, transition automatically
  useEffect(() => {
    if (user && authModalOpen) {
      setAuthModalOpen(false);
      setView('dashboard');
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    }
  }, [user, authModalOpen, pendingTab]);

  // If user signs out while on dashboard, return cleanly to landing page
  useEffect(() => {
    if (!loading && !user && view === 'dashboard') {
      setView('landing');
    }
  }, [loading, user, view]);

  const handleIntroComplete = useCallback(() => {
    try {
      sessionStorage.setItem('cp_intro_seen', '1');
    } catch {
      // ignore storage quota issues
    }
    setShowIntro(false);
  }, []);

  const handleStartJourney = (targetSection?: string) => {
    const resolvedTab: WorkspaceTab =
      targetSection && VALID_TABS.includes(targetSection as WorkspaceTab)
        ? (targetSection as WorkspaceTab)
        : 'overview';

    if (user) {
      setActiveTab(resolvedTab);
      setView('dashboard');
    } else {
      setPendingTab(resolvedTab);
      setAuthMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleLoginClick = () => {
    setPendingTab('overview');
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <>
      {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}

      {view === 'dashboard' && user ? (
        <DashboardShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExitToLanding={() => setView('landing')}
        />
      ) : (
        <LandingPage
          onStartJourney={handleStartJourney}
          onLoginClick={handleLoginClick}
          onReplayIntro={handleReplayIntro}
          isSignedIn={Boolean(user)}
        />
      )}

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onModeChange={setAuthMode}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
