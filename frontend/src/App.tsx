import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { type User, UserRole } from './types';
import { LoginForm } from './features/auth/login-form';
import { RegisterSMEForm } from './features/auth/register-sme-form';
import SMEDashboard from './features/dashboard/sme-dashboard';
import FIMarketplace from './features/trading/fi-marketplace';
import { FILayout } from './features/trading/layouts/fi-layout';
import { FIDashboard, FIPortfolio, FISettings } from './features/trading/pages/fi-pages';

// Admin Imports
import { AdminLayout } from './features/admin/layouts/admin-layout';
import { AdminDashboardOverview } from './features/admin/pages/dashboard-overview';
import { UserApprovalPage } from './features/admin/pages/user-approval';
import { InvoiceAuditPage } from './features/admin/pages/invoice-audit';
import { TransactionMonitorPage } from './features/admin/pages/transaction-monitor';

const App: React.FC = () => {
  // Basic Auth State Management for Demo
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Admin Navigation State
  const [adminPage, setAdminPage] = useState<string>('dashboard');

  // FI Navigation State
  const [fiPage, setFiPage] = useState<string>('marketplace');

  useEffect(() => {
    if (token && !currentUser) {
      // Restore session logic would go here.
    }
  }, [token, currentUser]);

  const handleLoginSuccess = (accessToken: string, email: string, role: UserRole) => {
    setToken(accessToken);
    const user: User = {
      id: 1,
      email,
      full_name: email.split('@')[0],
      role,
      is_active: true
    };
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setCurrentUser(null);
    setView('LOGIN');
    setAdminPage('dashboard');
  };

  const renderContent = () => {
    if (!token || !currentUser) {
      if (view === 'REGISTER') {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <RegisterSMEForm
              onSuccess={() => setView('LOGIN')}
              onCancel={() => setView('LOGIN')}
            />
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onRegisterClick={() => setView('REGISTER')}
          />
        </div>
      );
    }

    if (currentUser.role === UserRole.SME) {
      return <SMEDashboard onLogout={handleLogout} />;
    }

    if (currentUser.role === UserRole.FI) {
      return (
        <FILayout
          currentPage={fiPage}
          onNavigate={setFiPage}
          onLogout={handleLogout}
        >
          {fiPage === 'dashboard' && <FIDashboard />}
          {fiPage === 'marketplace' && <FIMarketplace onLogout={handleLogout} />}
          {fiPage === 'portfolio' && <FIPortfolio />}
          {fiPage === 'settings' && <FISettings />}
        </FILayout>
      );
    }

    if (currentUser.role === UserRole.ADMIN) {
      return (
        <AdminLayout
          currentPage={adminPage}
          onNavigate={setAdminPage}
          onLogout={handleLogout}
        >
          {adminPage === 'dashboard' && <AdminDashboardOverview />}
          {adminPage === 'users' && <UserApprovalPage />}
          {adminPage === 'invoices' && <InvoiceAuditPage />}
          {adminPage === 'transactions' && <TransactionMonitorPage />}
        </AdminLayout>
      )
    }

    return (
      <div className="flex h-screen w-screen items-center justify-center">
        Unknown Role: {currentUser.role} <button onClick={handleLogout}>Logout</button>
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      {renderContent()}
    </>
  );
};


export default App;