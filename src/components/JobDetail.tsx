import React, { useState, useRef } from 'react';
import { Job, JobStatus, AIResponse } from '../types';
import { 
  ArrowLeft, Camera, CheckCircle2, AlertCircle, FileDown, 
  Send, Sparkles, Loader2, Trash2, Image as ImageIcon,
  History, CheckSquare, ListChecks, User, Plus
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { analyzeJobMedia } from '../services/gemini';
import { exportToPDF } from '../utils/pdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  job: Job;
  onBack: () => void;
  onUpdate: (job: Job) => void;
  onDelete: () => void;
}

export const JobDetail: React.FC<Props> = ({ job, onBack, onUpdate, onDelete }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const actRef = useRef<HTMLDivElement>(null);

  const onDropBefore = async (files: File[]) => {
    const base64s = await Promise.all(files.map(fileToDataUrl));
    onUpdate({ ...job, photosBefore: [...job.photosBefore, ...base64s] });
  };

  const onDropAfter = async (files: File[]) => {
    const base64s = await Promise.all(files.map(fileToDataUrl));
    onUpdate({ ...job, photosAfter: [...job.photosAfter, ...base64s] });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps: getBeforeProps, getInputProps: getBeforeInput } = useDropzone({ onDrop: onDropBefore, accept: { 'image/*': [] } });
  const { getRootProps: getAfterProps, getInputProps: getAfterInput } = useDropzone({ onDrop: onDropAfter, accept: { 'image/*': [] } });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const analysis = await analyzeJobMedia(job);
      onUpdate({ ...job, aiAnalysis: analysis, status: analysis.status });
    } catch (e) {
      alert('Ошибка при анализе AI. Попробуйте еще раз.');
    } finally {
      setAnalyzing(false);
    }
  };

  const removePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      const newPhotos = [...job.photosBefore];
      newPhotos.splice(index, 1);
      onUpdate({ ...job, photosBefore: newPhotos });
    } else {
      const newPhotos = [...job.photosAfter];
      newPhotos.splice(index, 1);
      onUpdate({ ...job, photosAfter: newPhotos });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} />
          <span>Назад к реестру</span>
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handleAnalyze}
            disabled={analyzing || job.photosBefore.length === 0 || job.photosAfter.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            {analyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            <span>{job.aiAnalysis ? 'Перепроверить AI' : 'Проверить AI'}</span>
          </button>
          <button 
            onClick={() => exportToPDF('report-container', `Report_${job.externalId}`)}
            disabled={!job.aiAnalysis}
            className="bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <FileDown size={20} />
            <span>Отчет PDF</span>
          </button>
          <button 
             onClick={() => exportToPDF('act-container', `Act_${job.externalId}`)}
             disabled={!job.aiAnalysis}
             className="bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <FileDown size={20} />
            <span>Акт PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Job Info & Evidence */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{job.address}</h2>
                <p className="text-gray-500 font-mono text-sm">Заявка #{job.externalId}</p>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border",
                job.status === JobStatus.ACCEPTED ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-blue-100 text-blue-700 border-blue-200"
              )}>
                {job.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Исполнитель</p>
                  <p className="font-medium">{job.performer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <History size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Создана</p>
                  <p className="font-medium">{format(new Date(job.dateCreated), 'PPP', { locale: ru })}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">Описание:</p>
              <p className="text-sm text-gray-600 leading-relaxed">{job.description}</p>
            </div>
          </div>

          {/* Media Uploads */}
          <div className="grid grid-cols-1 gap-6">
            {/* Before */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <Camera size={18} className="text-rose-500" />
                  Фото ДО
                </h3>
                <span className="text-xs text-gray-400">{job.photosBefore.length} фото</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {job.photosBefore.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => removePhoto('before', idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div {...getBeforeProps()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                  <input {...getBeforeInput()} />
                  <Plus size={20} className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* After */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Фото ПОСЛЕ
                </h3>
                <span className="text-xs text-gray-400">{job.photosAfter.length} фото</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {job.photosAfter.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => removePhoto('after', idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div {...getAfterProps()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                  <input {...getAfterInput()} />
                  <Plus size={20} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: AI Result & Preview */}
        <div className="lg:col-span-7 space-y-6">
          {!job.aiAnalysis && !analyzing ? (
            <div className="h-full min-h-[400px] bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
                <Sparkles className="text-indigo-600 w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-2">Готовы к проверке?</h3>
              <p className="text-gray-500 max-w-sm mb-6">Загрузите фото "до" и "после", чтобы AI проанализировал изменения и сформировал отчет.</p>
              <button 
                onClick={handleAnalyze}
                disabled={job.photosBefore.length === 0 || job.photosAfter.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200"
              >
                Запустить анализ
              </button>
            </div>
          ) : analyzing ? (
            <div className="h-full min-h-[400px] bg-white rounded-3xl border border-gray-200 flex flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI анализирует изменения...</h3>
              <p className="text-gray-500 max-w-sm">Сравниваем фотографии, проверяем комплектность и готовим документы.</p>
            </div>
          ) : job.aiAnalysis ? (
            <div className="space-y-6">
              {/* AI Summary Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <Sparkles className="text-white w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">Результат проверки AI</h3>
                </div>

                {job.aiAnalysis.missing_evidence_ru.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3">
                    <AlertCircle className="text-rose-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-rose-800">Не хватает доказательств:</p>
                      <ul className="text-sm text-rose-700 list-disc list-inside mt-1">
                        {job.aiAnalysis.missing_evidence_ru.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <ListChecks size={14} /> Чек-лист
                    </h4>
                    <ul className="space-y-2">
                      {job.aiAnalysis.checklist_ru.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckSquare size={16} className="text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <History size={14} /> Изменения
                    </h4>
                    <ul className="space-y-2">
                      {job.aiAnalysis.before_after_changes_ru.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Document Previews */}
              <div className="space-y-8">
                {/* Illustrated Report Preview */}
                <div id="report-container" className="bg-white p-10 rounded-3xl border border-gray-200 shadow-sm space-y-8 text-[#1A1A1A]">
                  <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter">Иллюстрированный отчет</h2>
                      <p className="text-gray-500 mt-1">Результат выполнения работ по заявке {job.externalId}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{job.address}</p>
                      <p className="text-sm text-gray-500">{format(new Date(), 'dd.MM.yyyy')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Фото ДО</p>
                      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                        <img src={job.photosBefore[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-black uppercase text-emerald-600 tracking-widest">Фото ПОСЛЕ</p>
                      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-emerald-200">
                        <img src={job.photosAfter[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl font-bold border-l-4 border-indigo-600 pl-4">Резюме результата</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {job.aiAnalysis.report_ru.executive_summary.map((s, i) => (
                        <p key={i} className="text-gray-700 leading-relaxed">{s}</p>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                       <CheckCircle2 size={18} className="text-emerald-600" />
                       Контроль качества
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {job.aiAnalysis.report_ru.quality_notes.map((n, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Act Preview */}
                <div id="act-container" className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm space-y-8 text-[#1A1A1A] font-serif">
                   <div className="text-center space-y-2">
                     <h2 className="text-2xl font-bold uppercase underline decoration-2 underline-offset-8">{job.aiAnalysis.act_ru.title}</h2>
                     <p className="text-sm italic">к договору подряда № {job.externalId}</p>
                   </div>

                   <div className="flex justify-between text-sm font-bold">
                     <span>г. Москва</span>
                     <span>{format(new Date(), 'dd MMMM yyyy', { locale: ru })} г.</span>
                   </div>

                   <div className="space-y-6 text-sm leading-relaxed">
                     <p>Мы, нижеподписавшиеся, представитель Исполнителя <strong>{job.performer}</strong> с одной стороны, и Заказчик с другой стороны, составили настоящий Акт о том, что Исполнителем выполнены следующие работы по адресу: <strong>{job.address}</strong>.</p>
                     
                     <table className="w-full border-collapse border border-gray-300">
                       <thead>
                         <tr className="bg-gray-50">
                           <th className="border border-gray-300 p-2 text-left">Наименование работ</th>
                           <th className="border border-gray-300 p-2 text-center">Статус</th>
                         </tr>
                       </thead>
                       <tbody>
                         {job.aiAnalysis.act_ru.works_done.map((work, i) => (
                           <tr key={i}>
                             <td className="border border-gray-300 p-2">{work}</td>
                             <td className="border border-gray-300 p-2 text-center text-emerald-600 font-bold">Выполнено</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>

                     <div className="space-y-2">
                       <p className="font-bold">Использованные материалы:</p>
                       <ul className="list-disc list-inside">
                         {job.aiAnalysis.materials_ru.length > 0 ? job.aiAnalysis.materials_ru.map((m, i) => (
                           <li key={i}>{m.name} — {m.qty} {m.unit}</li>
                         )) : <li>Материалы не использовались или не указаны</li>}
                       </ul>
                     </div>

                     <p>Работы выполнены в полном объеме, в установленные сроки и с надлежащим качеством. Стороны претензий друг к другу не имеют.</p>
                   </div>

                   <div className="grid grid-cols-2 gap-12 pt-12">
                     <div className="space-y-8">
                       <p className="font-bold uppercase text-xs tracking-widest text-gray-400">От Исполнителя:</p>
                       <div className="border-b border-gray-900 pb-2 flex justify-between items-end">
                         <span className="text-xs italic">Подпись</span>
                         <span className="font-bold">{job.performer}</span>
                       </div>
                     </div>
                     <div className="space-y-8">
                       <p className="font-bold uppercase text-xs tracking-widest text-gray-400">От Заказчика:</p>
                       <div className="border-b border-gray-900 pb-2 flex justify-between items-end">
                         <span className="text-xs italic">Подпись</span>
                         <span className="text-gray-300">_________________</span>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
