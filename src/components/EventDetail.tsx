import React, { useState, useEffect } from 'react';
import type { Event } from '../types';
import { getApiUrl, tokenStorage } from '../services/api';

interface EventDetailProps {
  eventId: number;
  onClose: () => void;
  isLoggedIn: boolean;
}

interface Ticket {
  id: number;
  nama_tiket: string;
  harga: number;
  kuota: number;
  event_id: number;
}

interface EventDetailData {
  event: Event;
  tickets: Ticket[];
}

const EventDetail: React.FC<EventDetailProps> = ({ eventId, onClose, isLoggedIn }) => {
  const [eventDetail, setEventDetail] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/events/${eventId}`));
        if (!response.ok) throw new Error('Gagal memuat detail event');
        const data = await response.json();
        setEventDetail(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [eventId]);

  const handleRegister = async () => {
    if (!selectedTicket) {
      alert('Pilih tipe tiket terlebih dahulu');
      return;
    }

    if (!isLoggedIn) {
      alert('Silakan login terlebih dahulu untuk mendaftar');
      return;
    }

    setRegistering(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/events/${eventId}/register`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tiket_tipe_id: selectedTicket }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal mendaftar');
      }

      const result = await response.json();
      
      // Jika tiket gratis, langsung sukses
      if (result.isFree) {
        alert(`${result.message}\n\nQR Code: ${result.pendaftaran.qr_code_unik}`);
        onClose();
        return;
      }

      // Jika berbayar, redirect ke Midtrans Snap
      if (result.paymentToken) {
        // Load Midtrans Snap script
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', 'SB-Mid-client-YOUR_CLIENT_KEY_HERE'); // Ganti dengan client key
        document.body.appendChild(script);

        script.onload = () => {
          // @ts-ignore - Midtrans Snap
          window.snap.pay(result.paymentToken, {
            onSuccess: function() {
              alert('Pembayaran berhasil! Silakan cek email atau dashboard untuk tiket Anda.');
              onClose();
            },
            onPending: function() {
              alert('Menunggu pembayaran. Silakan selesaikan pembayaran Anda.');
              onClose();
            },
            onError: function() {
              alert('Pembayaran gagal. Silakan coba lagi.');
            },
            onClose: function() {
              console.log('Payment popup closed');
            }
          });
        };
      } else {
        alert(result.message);
        onClose();
      }
      
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Memuat detail event...</p>
        </div>
      </div>
    );
  }

  if (error || !eventDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600 mb-4">{error || 'Event tidak ditemukan'}</p>
          <button onClick={onClose} className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const { event, tickets } = eventDetail;
  const poster = event.poster_url || `https://placehold.co/600x400/3498db/ffffff?text=${encodeURIComponent(event.nama_event)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="min-h-screen px-4 py-8">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl mx-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Event Image */}
          <div className="w-full h-64 md:h-96 overflow-hidden rounded-t-lg">
            <img 
              src={poster} 
              alt={event.nama_event}
              className="w-full h-full object-cover"
              onError={(e) => { 
                const target = e.target as HTMLImageElement;
                target.src = `https://placehold.co/600x400/3498db/ffffff?text=Image+Error`; 
              }}
            />
          </div>

          {/* Event Details */}
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.nama_event}</h1>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Tanggal Mulai</p>
                  <p className="text-gray-900 font-medium">{formatDate(event.tanggal_mulai)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Lokasi</p>
                  <p className="text-gray-900 font-medium">{event.lokasi}</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Diselenggarakan oleh</p>
                  <p className="text-gray-900 font-medium">{event.nama_organisasi}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Deskripsi Event</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{event.deskripsi || 'Tidak ada deskripsi'}</p>
            </div>

            {/* Tickets Section */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pilih Tiket</h2>
              
              {tickets.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Belum ada tiket yang tersedia untuk event ini.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTicket === ticket.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="ticket"
                            checked={selectedTicket === ticket.id}
                            onChange={() => setSelectedTicket(ticket.id)}
                            className="mr-3"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{ticket.nama_tiket}</p>
                            <p className="text-sm text-gray-500">Kuota: {ticket.kuota} orang</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{formatPrice(ticket.harga)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Register Button */}
              {tickets.length > 0 && (
                <button
                  onClick={handleRegister}
                  disabled={!selectedTicket || registering || !isLoggedIn}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    !selectedTicket || registering || !isLoggedIn
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {registering ? 'Memproses...' : !isLoggedIn ? 'Login untuk Mendaftar' : 'Daftar Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
