import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  CalendarDaysIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import AuthModal from './components/AuthModal';
import EventCard from './components/EventCard';
import EventDetail from './components/EventDetail';
import CreateEventModal from './components/CreateEventModal';
import MyRegistrations from './components/MyRegistrations';
import OrganizationDashboard from './components/OrganizationDashboard';
import { eventsAPI, authAPI, tokenStorage, userStorage } from './services/api';
import type { Event, User } from './types';

const App: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isMyRegistrationsOpen, setIsMyRegistrationsOpen] = useState(false);
  const [isOrgDashboardOpen, setIsOrgDashboardOpen] = useState(false);

  // Cek apakah user sudah login saat pertama kali load
  useEffect(() => {
    const savedUser = userStorage.get();
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        userStorage.remove();
        tokenStorage.remove();
      }
    }
  }, []);

  // Fetch events - HANYA jika user sudah login
  useEffect(() => {
    const fetchEvents = async () => {
      // Jika user belum login, jangan fetch events
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await eventsAPI.getAll();
        setEvents(data);
        setError(null);
      } catch (e) {
        console.error("Gagal mengambil data event:", e);
        setError("Gagal memuat data event. Pastikan backend sudah berjalan.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]); // Re-fetch ketika user berubah (login/logout)

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    // 🔐 Use secure logout from authAPI
    authAPI.logout();
    setUser(null);
    setEvents([]);
  };

  const handleEventCreated = async () => {
    // Refresh events setelah event baru dibuat
    try {
      const data = await eventsAPI.getAll();
      setEvents(data);
    } catch (e) {
      console.error("Gagal refresh events:", e);
    }
  };

  const handleViewDetail = (eventId: number) => {
    setSelectedEventId(eventId);
  };

  const handleCloseDetail = () => {
    setSelectedEventId(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* 📱 Navbar - Mobile First Responsive */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="w-full px-4 py-3 md:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo - Compact di mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
              </svg>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-blue-600 whitespace-nowrap">
                EventKampus
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              {user ? (
                <>
                  {/* Tombol Dashboard - berbeda untuk PESERTA dan ORGANISASI */}
                  {user.role === 'PESERTA' ? (
                    <button 
                      onClick={() => setIsMyRegistrationsOpen(true)}
                      className="bg-purple-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                    >
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      <span className="hidden lg:inline">Event Saya</span>
                      <span className="lg:hidden">Event</span>
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => setIsOrgDashboardOpen(true)}
                        className="bg-purple-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                      >
                        <ChartBarIcon className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button 
                        onClick={() => setIsCreateEventModalOpen(true)}
                        className="bg-green-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
                      >
                        <PlusCircleIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">Buat Event</span>
                        <span className="lg:hidden">Buat</span>
                      </button>
                    </>
                  )}
                  
                  <div className="text-xs border-l border-gray-300 pl-3 hidden lg:flex items-center gap-2">
                    <UserCircleIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-gray-600 max-w-[150px] truncate">
                        <span className="font-medium text-gray-900">{user.nama_lengkap}</span>
                      </p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleOpenAuth('login')}
                    className="bg-blue-600 text-white py-1.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => handleOpenAuth('register')}
                    className="bg-white border border-gray-300 text-gray-700 py-1.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>

            {/* 📱 Mobile Navigation - Compact */}
            <div className="flex md:hidden items-center gap-1.5">
              {user ? (
                <>
                  {user.role === 'PESERTA' ? (
                    <button 
                      onClick={() => setIsMyRegistrationsOpen(true)}
                      className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 active:scale-95 transition-all"
                      aria-label="Event Saya"
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => setIsOrgDashboardOpen(true)}
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 active:scale-95 transition-all"
                        aria-label="Dashboard"
                      >
                        <ChartBarIcon className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={() => setIsCreateEventModalOpen(true)}
                        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 active:scale-95 transition-all"
                        aria-label="Buat Event"
                      >
                        <PlusCircleIcon className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 active:scale-95 transition-all"
                    aria-label="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleOpenAuth('login')}
                    className="bg-blue-600 text-white py-1.5 px-3 rounded-md text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => handleOpenAuth('register')}
                    className="bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-semibold hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Daftar
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* 📱 Konten Utama - Responsive */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Jika user belum login, tampilkan welcome message */}
        {!user ? (
          <div className="text-center py-6 sm:py-12 lg:py-16">
            <div className="max-w-2xl mx-auto">
              <CalendarDaysIcon className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto text-blue-600 mb-3 sm:mb-4" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                Selamat Datang di EventKampus
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                Platform terbaik untuk menemukan dan mengelola event kampus Anda.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  <span className="font-semibold">Silakan login atau register</span> untuk melihat daftar event yang tersedia.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button 
                    onClick={() => handleOpenAuth('login')}
                    className="bg-blue-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all text-sm sm:text-base w-full sm:w-auto"
                  >
                    Login Sekarang
                  </button>
                  <button 
                    onClick={() => handleOpenAuth('register')}
                    className="bg-white border-2 border-blue-600 text-blue-600 py-2.5 px-6 rounded-lg font-semibold hover:bg-blue-50 active:scale-[0.98] transition-all text-sm sm:text-base w-full sm:w-auto"
                  >
                    Daftar Gratis
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 text-left">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Untuk Peserta</h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">Temukan event menarik, daftar dengan mudah, dan kelola tiket Anda.</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Untuk Organisasi</h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">Buat event, kelola peserta, dan pantau penjualan tiket secara real-time.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Event Terbaru</h2>

            {/* Tampilan Loading */}
            {loading && (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="text-xl text-gray-500 mt-4 animate-pulse">Memuat event...</p>
              </div>
            )}

            {/* Tampilan Error */}
            {error && (
              <div className="max-w-md mx-auto text-center py-20">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-md">
                  <div className="flex justify-center mb-4">
                    <div className="bg-red-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-red-800 mb-2">Oops! Terjadi Kesalahan</p>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* 📱 Tampilan Daftar Event - Responsive Grid */}
            {!loading && !error && (
              <>
                {events.length === 0 ? (
                  <div className="text-center py-12 sm:py-20 px-4">
                    <p className="text-lg sm:text-xl text-gray-500">Saat ini belum ada event yang tersedia.</p>
                    {user.role === 'ORGANISASI' && (
                      <button 
                        onClick={() => setIsCreateEventModalOpen(true)}
                        className="mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-base sm:text-lg"
                      >
                        Buat Event Pertama
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map(event => (
                      <EventCard key={event.id} event={event} onViewDetail={handleViewDetail} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Create Event Modal - HANYA untuk ORGANISASI */}
      {user?.role === 'ORGANISASI' && (
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          onEventCreated={handleEventCreated}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEventId && (
        <EventDetail
          eventId={selectedEventId}
          onClose={handleCloseDetail}
          isLoggedIn={!!user}
        />
      )}

      {/* My Registrations Modal - untuk PESERTA */}
      <MyRegistrations
        isOpen={isMyRegistrationsOpen}
        onClose={() => setIsMyRegistrationsOpen(false)}
      />

      {/* Organization Dashboard Modal - untuk ORGANISASI */}
      <OrganizationDashboard
        isOpen={isOrgDashboardOpen}
        onClose={() => setIsOrgDashboardOpen(false)}
      />
    </div>
  );
};

export default App;
