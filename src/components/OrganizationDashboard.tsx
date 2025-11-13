import React, { useState, useEffect } from 'react';
import { tokenStorage } from '../services/api';
import AddTicketModal from './AddTicketModal';

interface MyEvent {
  id: number;
  nama_event: string;
  tanggal_mulai: string;
  lokasi: string;
}

interface Attendee {
  registrasi_id: number;
  nama_lengkap: string;
  email: string;
  nama_tiket: string;
  harga: number;
  status_pembayaran: string;
}

interface OrganizationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({ isOpen, onClose }) => {
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MyEvent | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        const token = tokenStorage.get();
        const response = await fetch(getApiUrl('/organisasi/my-events'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Gagal memuat data event');
        const data = await response.json();
        setMyEvents(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [isOpen]);

  const fetchAttendees = async (eventId: number) => {
    try {
      setLoadingAttendees(true);
      const token = tokenStorage.get();
      const response = await fetch(getApiUrl(`/organisasi/my-events/${eventId}/attendees`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Gagal memuat data peserta');
      const data = await response.json();
      setAttendees(data);
      setSelectedEventId(eventId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const confirmPayment = async (registrasiId: number) => {
    if (!confirm('Konfirmasi pembayaran peserta ini?')) return;

    try {
      const token = tokenStorage.get();
      const response = await fetch(getApiUrl(`/organisasi/confirm-payment/${registrasiId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Gagal konfirmasi pembayaran');
      
      alert('Pembayaran berhasil dikonfirmasi!');
      // Refresh attendees
      if (selectedEventId) {
        fetchAttendees(selectedEventId);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Terjadi kesalahan');
    }
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      LUNAS: 'bg-green-100 text-green-800',
      BATAL: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="min-h-screen px-4 py-8">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Organisasi</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Events List */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Event Saya</h3>
                
                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {error && <p className="text-red-600 text-center py-12">{error}</p>}

                {!loading && !error && (
                  <>
                    {myEvents.length === 0 ? (
                      <p className="text-gray-500 text-center py-12">Belum ada event</p>
                    ) : (
                      <div className="space-y-3">
                        {myEvents.map((event) => (
                          <div key={event.id} className="space-y-2">
                            <button
                              onClick={() => fetchAttendees(event.id)}
                              className={`w-full text-left border rounded-lg p-4 transition-all ${
                                selectedEventId === event.id
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              <h4 className="font-semibold text-gray-900">{event.nama_event}</h4>
                              <p className="text-sm text-gray-600">📅 {formatDate(event.tanggal_mulai)}</p>
                              <p className="text-sm text-gray-600">📍 {event.lokasi}</p>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsAddTicketModalOpen(true);
                              }}
                              className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Tambah Tiket
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Attendees List */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Daftar Peserta</h3>
                
                {!selectedEventId ? (
                  <p className="text-gray-500 text-center py-12">Pilih event untuk melihat peserta</p>
                ) : loadingAttendees ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : attendees.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">Belum ada peserta</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {attendees.map((attendee) => (
                      <div key={attendee.registrasi_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{attendee.nama_lengkap}</p>
                            <p className="text-sm text-gray-600">{attendee.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(attendee.status_pembayaran)}`}>
                            {attendee.status_pembayaran}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">🎫 {attendee.nama_tiket} - {formatPrice(attendee.harga)}</p>
                        
                        {attendee.status_pembayaran === 'PENDING' && (
                          <button
                            onClick={() => confirmPayment(attendee.registrasi_id)}
                            className="mt-3 w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                          >
                            Konfirmasi Pembayaran
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticket Modal */}
      {selectedEvent && (
        <AddTicketModal
          isOpen={isAddTicketModalOpen}
          onClose={() => {
            setIsAddTicketModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventName={selectedEvent.nama_event}
          onTicketAdded={() => {
            // Refresh data jika diperlukan
            if (selectedEventId) {
              fetchAttendees(selectedEventId);
            }
          }}
        />
      )}
    </div>
  );
};

export default OrganizationDashboard;
