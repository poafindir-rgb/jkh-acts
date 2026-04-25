import React, { useState } from 'react';
import { Job, JobStatus, JobCategory } from '../types';
import { Search, Filter, Calendar, MapPin, User, ChevronRight, Trash2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  jobs: Job[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export const JobRegistry: React.FC<Props> = ({ jobs, onSelect, onDelete, loading }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.address.toLowerCase().includes(search.toLowerCase()) || 
                         job.externalId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.DRAFT: return 'bg-gray-100 text-gray-700 border-gray-200';
      case JobStatus.NEEDS_MORE_EVIDENCE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case JobStatus.READY_FOR_REVIEW: return 'bg-blue-100 text-blue-700 border-blue-200';
      case JobStatus.ACCEPTED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case JobStatus.REWORK: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: JobStatus) => {
    switch (status) {
      case JobStatus.DRAFT: return 'Черновик';
      case JobStatus.NEEDS_MORE_EVIDENCE: return 'Нужны фото';
      case JobStatus.READY_FOR_REVIEW: return 'На проверке';
      case JobStatus.ACCEPTED: return 'Принято';
      case JobStatus.REWORK: return 'Доработка';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Поиск по адресу или номеру..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="flex-1 md:flex-none px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value={JobStatus.DRAFT}>Черновик</option>
            <option value={JobStatus.NEEDS_MORE_EVIDENCE}>Нужны фото</option>
            <option value={JobStatus.READY_FOR_REVIEW}>На проверке</option>
            <option value={JobStatus.ACCEPTED}>Принято</option>
            <option value={JobStatus.REWORK}>Доработка</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <ClipboardList className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Заявки не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <div 
              key={job.id}
              onClick={() => onSelect(job.id)}
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", getStatusColor(job.status))}>
                    {getStatusLabel(job.status)}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">#{job.externalId}</span>
                </div>

                <div>
                  <h3 className="font-bold text-lg line-clamp-1 group-hover:text-emerald-600 transition-colors">{job.address}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">{job.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={14} />
                    <span>{format(new Date(job.dateCreated), 'dd MMM yyyy', { locale: ru })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User size={14} />
                    <span className="truncate">{job.performer}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  {job.category}
                </span>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                    className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
