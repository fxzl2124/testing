import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { tokenStorage, getApiUrl } from '../services/api';

interface Registration {
  registrasi_id: number;
  nama_event: string;
  tanggal_mulai: string;
  lokasi: string;
  status_pembayaran: string;
  nama_tiket: string;
  harga: number;
  qr_code_unik: string;
}

interface MyRegistrationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MyRegistrations: React.FC<MyRegistrationsProps> = ({ isOpen, onClose }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQR, setSelectedQR] = useState<Registration | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRegistrations = async () => {
      try {
        setLoading(true);
        const token = tokenStorage.get();
        const response = await fetch(getApiUrl('/peserta/my-registrations'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Gagal memuat data registrasi');
        const data = await response.json();
        setRegistrations(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [isOpen]);

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
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Event Saya</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Memuat data...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {registrations.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-xl text-gray-500">Anda belum mendaftar event apapun</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {registrations.map((reg) => (
                      <div key={reg.registrasi_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{reg.nama_event}</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                                <span>{formatDate(reg.tanggal_mulai)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-red-600" />
                                <span>{reg.lokasi}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                <span>{reg.nama_tiket} - {formatPrice(reg.harga)}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(reg.status_pembayaran)}`}>
                              {reg.status_pembayaran}
                            </span>
                          </div>
                        </div>
                        
                        {/* Tombol Lihat QR Code - hanya jika LUNAS */}
                        {reg.status_pembayaran === 'LUNAS' && reg.qr_code_unik && (
                          <button
                            onClick={() => setSelectedQR(reg)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Lihat QR Code Tiket
                          </button>
                        )}

                        {/* Info jika belum lunas */}
                        {reg.status_pembayaran === 'PENDING' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                            ⏳ Menunggu konfirmasi pembayaran
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedQR.nama_event}</h3>
            <p className="text-gray-600 mb-6">{selectedQR.nama_tiket}</p>
            
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg shadow-inner mb-6 flex justify-center">
              <QRCodeSVG 
                value={selectedQR.qr_code_unik} 
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Scan QR Code ini saat check-in di event
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Download QR Code
                  const svg = document.querySelector('svg');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL('image/png');
                      const downloadLink = document.createElement('a');
                      downloadLink.download = `ticket-${selectedQR.registrasi_id}.png`;
                      downloadLink.href = pngFile;
                      downloadLink.click();
                    };
                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                  }
                }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Download QR
              </button>
              <button
                onClick={() => setSelectedQR(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRegistrations;
