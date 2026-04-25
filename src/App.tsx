import React, { useState, useEffect } from 'react';
import { Job, JobStatus, JobCategory } from './types';
import { JobRegistry } from './components/JobRegistry';
import { JobDetail } from './components/JobDetail';
import { JobForm } from './components/JobForm';
import { Plus, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job: Job) => {
    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      await fetchJobs();
      setIsCreating(false);
      setSelectedJobId(job.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      await fetchJobs();
      if (selectedJobId === id) setSelectedJobId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedJobId(null); setIsCreating(false); }}>
            <div className="bg-emerald-600 p-2 rounded-lg">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Актирование ЖКХ</h1>
          </div>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={20} />
            <span>Создать заявку</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <JobForm onSave={handleSaveJob} onCancel={() => setIsCreating(false)} />
            </motion.div>
          ) : selectedJobId && selectedJob ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <JobDetail 
                job={selectedJob} 
                onBack={() => setSelectedJobId(null)} 
                onUpdate={handleSaveJob}
                onDelete={() => handleDeleteJob(selectedJob.id)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="registry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <JobRegistry 
                jobs={jobs} 
                onSelect={setSelectedJobId} 
                loading={loading}
                onDelete={handleDeleteJob}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
