import React, { useState, useEffect } from 'react';
import { Job } from './types';
import { JobRegistry } from './components/JobRegistry';
import { JobDetail } from './components/JobDetail';
import { JobForm } from './components/JobForm';
import { Plus, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'jkh_acts_jobs';

function loadJobsFromLocalStorage(): Job[] {
  try {
    const savedJobs = localStorage.getItem(STORAGE_KEY);
    return savedJobs ? JSON.parse(savedJobs) : [];
  } catch (error) {
    console.error('Ошибка загрузки заявок из localStorage:', error);
    return [];
  }
}

function saveJobsToLocalStorage(jobs: Job[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (error) {
    console.error('Ошибка сохранения заявок в localStorage:', error);
  }
}

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
      const data = loadJobsFromLocalStorage();
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job: Job) => {
    try {
      const currentJobs = loadJobsFromLocalStorage();

      const savedJob: Job = {
        ...job,
        id: job.id || crypto.randomUUID(),
      };

      const jobExists = currentJobs.some((item) => item.id === savedJob.id);

      const updatedJobs = jobExists
        ? currentJobs.map((item) =>
            item.id === savedJob.id ? savedJob : item
          )
        : [savedJob, ...currentJobs];

      saveJobsToLocalStorage(updatedJobs);

      setJobs(updatedJobs);
      setIsCreating(false);
      setSelectedJobId(savedJob.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

    try {
      const currentJobs = loadJobsFromLocalStorage();
      const updatedJobs = currentJobs.filter((job) => job.id !== id);

      saveJobsToLocalStorage(updatedJobs);
      setJobs(updatedJobs);

      if (selectedJobId === id) {
        setSelectedJobId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setSelectedJobId(null);
              setIsCreating(false);
            }}
          >
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <ClipboardList size={26} />
            </div>

            <h1 className="text-2xl font-bold">Актирование ЖКХ</h1>
          </div>

          <button
            onClick={() => {
              setSelectedJobId(null);
              setIsCreating(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Plus size={20} />
            Создать заявку
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div
              key="creating"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <JobForm
                onSave={handleSaveJob}
                onCancel={() => setIsCreating(false)}
              />
            </motion.div>
          ) : selectedJobId && selectedJob ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <JobRegistry
                jobs={jobs}
                onSelect={setSelectedJobId}
                onDelete={handleDeleteJob}
                loading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
