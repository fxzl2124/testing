import React, { useState } from 'react';
import { tokenStorage, getApiUrl } from '../services/api';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventName: string;
  onTicketAdded: () => void;
}

const AddTicketModal: React.FC<AddTicketModalProps> = ({ 
  isOpen, 
  onClose, 
  eventId, 
  eventName,
  onTicketAdded 
}) => {
  const [namaTiket, setNamaTiket] = useState('');
  const [harga, setHarga] = useState('');
  const [kuota, setKuota] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNamaTiket('');
    setHarga('');
    setKuota('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = tokenStorage.get();
      const response = await fetch(getApiUrl(`/events/${eventId}/tickets`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_tiket: namaTiket,
          harga: parseInt(harga),
          kuota: parseInt(kuota),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambah tiket');
      }

      alert('Tiket berhasil ditambahkan!');
      onTicketAdded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tambah Tiket</h2>
        <p className="text-sm text-gray-600 mb-6">Event: {eventName}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nama_tiket" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Tiket *
            </label>
            <input
              id="nama_tiket"
              type="text"
              value={namaTiket}
              onChange={(e) => setNamaTiket(e.target.value)}
              required
              placeholder="Contoh: Early Bird, Regular, VIP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="harga" className="block text-sm font-medium text-gray-700 mb-1">
              Harga (Rp) *
            </label>
            <input
              id="harga"
              type="number"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              required
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Masukkan 0 untuk tiket gratis</p>
          </div>

          <div>
            <label htmlFor="kuota" className="block text-sm font-medium text-gray-700 mb-1">
              Kuota Peserta *
            </label>
            <input
              id="kuota"
              type="number"
              value={kuota}
              onChange={(e) => setKuota(e.target.value)}
              required
              min="1"
              placeholder="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTicketModal;
