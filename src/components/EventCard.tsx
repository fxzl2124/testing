import React from 'react';
import { CalendarDaysIcon, UserIcon, MapPinIcon } from '@heroicons/react/24/outline';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
  onViewDetail: (eventId: number) => void;
}

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

const EventCard: React.FC<EventCardProps> = ({ event, onViewDetail }) => {
  const poster = event.poster_url || `https://placehold.co/600x400/3498db/ffffff?text=${encodeURIComponent(event.nama_event)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      <div className="relative pb-[60%] overflow-hidden bg-gray-100">
        <img 
          src={poster} 
          alt={`Poster ${event.nama_event}`} 
          className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => { 
            const target = e.target as HTMLImageElement;
            target.src = `https://placehold.co/600x400/3498db/ffffff?text=Image+Error`; 
          }}
        />
      </div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
          {event.nama_event}
        </h3>
        
        <div className="space-y-1.5 mb-3 flex-1">
          <p className="text-xs text-gray-600 flex items-start gap-1">
            <CalendarDaysIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
            <span className="line-clamp-2 leading-tight">{formatDate(event.tanggal_mulai)}</span>
          </p>
          <p className="text-xs text-gray-600 flex items-start gap-1">
            <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="line-clamp-1 leading-tight">{event.lokasi}</span>
          </p>
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <UserIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-600" />
            <span className="line-clamp-1 leading-tight font-medium">{event.nama_organisasi}</span>
          </p>
        </div>

        <button 
          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
          onClick={() => onViewDetail(event.id)}
        >
          Lihat Detail
        </button>
      </div>
    </div>
  );
};

export default EventCard;
