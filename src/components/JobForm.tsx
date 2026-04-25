import React, { useState } from 'react';
import { Job, JobCategory, JobStatus } from '../types';
import { X, Save, FileText, MapPin, User, Info, Wand2, Image as ImageIcon, Loader2, Scan } from 'lucide-react';
import { classifyJob, analyzeSourcePhoto } from '../services/gemini';
import { useDropzone } from 'react-dropzone';

interface Props {
  onSave: (job: Job) => void;
  onCancel: () => void;
}

export const JobForm: React.FC<Props> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Job>>({
    externalId: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
    address: '',
    category: JobCategory.OTHER,
    description: '',
    performer: '',
    dateCreated: new Date().toISOString(),
    status: JobStatus.DRAFT,
    photosBefore: [],
    photosAfter: [],
    materials: [],
    sourcePhoto: undefined,
  });

  const [isClassifying, setIsClassifying] = useState(false);
  const [isAnalyzingSource, setIsAnalyzingSource] = useState(false);

  const onDropSource = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({ ...prev, sourcePhoto: base64 }));
      
      // Auto-analyze
      setIsAnalyzingSource(true);
      try {
        const extracted = await analyzeSourcePhoto(base64);
        setFormData(prev => ({
          ...prev,
          ...extracted,
        }));
      } catch (e) {
        alert('Не удалось распознать данные с фото. Попробуйте ввести вручную.');
      } finally {
        setIsAnalyzingSource(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onDropSource, 
    accept: { 'image/*': [] },
    multiple: false 
  });

  const handleAutoFill = async () => {
    if (!formData.description) return;
    setIsClassifying(true);
    try {
      const { category } = await classifyJob(formData.description);
      setFormData(prev => ({ ...prev, category }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address || !formData.description) return;
    onSave({
      ...formData,
      id: crypto.randomUUID(),
    } as Job);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold">Новая заявка</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-8 space-y-8">
        {/* Source Photo Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Scan size={18} className="text-indigo-600" />
            Импорт из фото заявки / скриншота
          </label>
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer",
              isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50",
              formData.sourcePhoto ? "border-emerald-500 bg-emerald-50" : ""
            )}
          >
            <input {...getInputProps()} />
            {isAnalyzingSource ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-sm font-medium text-indigo-600">AI распознает данные...</p>
              </div>
            ) : formData.sourcePhoto ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-emerald-200">
                  <img src={formData.sourcePhoto} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700">Фото загружено и обработано</p>
                  <p className="text-xs text-emerald-600">Нажмите, чтобы заменить</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm font-medium text-gray-600">Перетащите сюда фото заявки или нажмите для выбора</p>
                <p className="text-xs text-gray-400 mt-1">AI автоматически заполнит поля ниже</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Info size={16} /> Номер заявки
              </label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.externalId}
                onChange={e => setFormData({ ...formData, externalId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={16} /> Категория
              </label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as JobCategory })}
              >
                {Object.values(JobCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MapPin size={16} /> Адрес объекта
            </label>
            <input 
              type="text" 
              required
              placeholder="г. Москва, ул. Ленина, д. 1..."
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={16} /> Описание проблемы
              </label>
              <button 
                type="button"
                onClick={handleAutoFill}
                disabled={isClassifying || !formData.description}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Wand2 size={14} />
                {isClassifying ? 'Определяем...' : 'AI Категория'}
              </button>
            </div>
            <textarea 
              required
              rows={4}
              placeholder="Опишите, что случилось..."
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User size={16} /> Исполнитель
            </label>
            <input 
              type="text" 
              required
              placeholder="ФИО или название бригады"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.performer}
              onChange={e => setFormData({ ...formData, performer: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-[0.98]"
            >
              Сохранить заявку
            </button>
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
