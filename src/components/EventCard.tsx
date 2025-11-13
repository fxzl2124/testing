import React from 'react';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
  onViewDetail: (eventId: number) => void;
}

// Icon Components
const CalendarIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UserIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LocationIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="relative pb-[60%] overflow-hidden bg-gray-100">
        <img 
          src={poster} 
          alt={`Poster ${event.nama_event}`} 
          className="absolute inset-0 w-full h-full object-cover"
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
            <span className="flex-shrink-0 mt-px"><CalendarIcon /></span>
            <span className="line-clamp-2 leading-tight">{formatDate(event.tanggal_mulai)}</span>
          </p>
          <p className="text-xs text-gray-600 flex items-start gap-1">
            <span className="flex-shrink-0 mt-px"><LocationIcon /></span>
            <span className="line-clamp-1 leading-tight">{event.lokasi}</span>
          </p>
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <span className="flex-shrink-0 mt-px"><UserIcon /></span>
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
