// src/components/ImportProducts.tsx

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createProduct, createBatch } from '../api/databaseAPI';
import { ProductCategory } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ImportProductsProps {
  onImportComplete: () => Promise<void>;
  onClose: () => void;
}

interface ImportRow {
  barcode: string;
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  expirationDate: string;
  manufactureDate?: string;
  location?: string;
}

export default function ImportProducts({ onImportComplete, onClose }: ImportProductsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (value: any): string => {
    if (!value) return '';
    
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    if (typeof value === 'string') {
      const dotFormat = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (dotFormat) {
        const [, day, month, year] = dotFormat;
        return `${year}-${month}-${day}`;
      }
      
      const slashFormat = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (slashFormat) {
        const [, day, month, year] = slashFormat;
        return `${year}-${month}-${day}`;
      }
      
      const isoFormat = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoFormat) {
        return value;
      }
      
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    return value;
  };

  const downloadTemplate = () => {
    const headers = [
      'Штрихкод (обязательно)',
      'Название товара (обязательно)',
      'Категория (dairy/bakery/meat_sausage/grocery/beverages/confectionery/other)',
      'Цена (обязательно)',
      'Количество (обязательно)',
      'Дата изготовления (ГГГГ-ММ-ДД)',
      'Срок годности (ГГГГ-ММ-ДД, обязательно)',
      'Локация (shelf_1/shelf_2/shelf_3/shelf_4/shelf_5)'
    ];

    const sampleData = [
      ['4607142210012', 'Молоко Мария-Ра 2.5%, 900 мл', 'dairy', 69, 12, '2026-08-25', '2026-09-01', 'shelf_1'],
      ['4607002340021', 'Батон Алтайский нарезанный, 350 г', 'bakery', 34, 15, '2026-08-28', '2026-08-31', 'shelf_3'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    XLSX.writeFile(wb, 'шаблон_импорта_товаров.xlsx');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('idle');
    setMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        console.log('📋 Заголовки из файла:', Object.keys(jsonData[0] || {}));

        const parsedData: ImportRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          const rowNum = index + 2;

          const barcode = row['Штрихкод (обязательно)'];
          const name = row['Название товара (обязательно)'];
          const category = row['Категория (dairy/bakery/meat_sausage/grocery/beverages/confectionery/other)'] || 'other';
          const price = row['Цена (обязательно)'];
          const quantity = row['Количество (обязательно)'];
          const manufactureDateRaw = row['Дата изготовления (ГГГГ-ММ-ДД)'];
          const expirationDateRaw = row['Срок годности (ГГГГ-ММ-ДД, обязательно)'];
          const location = row['Локация (shelf_1/shelf_2/shelf_3/shelf_4/shelf_5)'] || 'shelf_1';

          if (!barcode) {
            errors.push(`Строка ${rowNum}: отсутствует штрихкод`);
            return;
          }
          if (!name) {
            errors.push(`Строка ${rowNum}: отсутствует название товара`);
            return;
          }
          if (!price) {
            errors.push(`Строка ${rowNum}: отсутствует цена`);
            return;
          }
          if (!quantity) {
            errors.push(`Строка ${rowNum}: отсутствует количество`);
            return;
          }
          if (!expirationDateRaw) {
            errors.push(`Строка ${rowNum}: отсутствует срок годности`);
            return;
          }

          const expirationDate = parseDate(expirationDateRaw);
          const manufactureDate = manufactureDateRaw ? parseDate(manufactureDateRaw) : undefined;

          if (!expirationDate || expirationDate === 'Invalid Date') {
            errors.push(`Строка ${rowNum}: неверный формат даты "${expirationDateRaw}"`);
            return;
          }

          const validCategories = ['dairy', 'bakery', 'meat_sausage', 'grocery', 'beverages', 'confectionery', 'other'];
          const categoryValue = String(category).trim().toLowerCase();
          if (!validCategories.includes(categoryValue)) {
            errors.push(`Строка ${rowNum}: неверная категория "${category}". Допустимые: ${validCategories.join(', ')}`);
            return;
          }

          const validLocations = ['shelf_1', 'shelf_2', 'shelf_3', 'shelf_4', 'shelf_5'];
          const locationValue = String(location).trim();
          if (!validLocations.includes(locationValue)) {
            errors.push(`Строка ${rowNum}: неверная локация "${location}". Допустимые: ${validLocations.join(', ')}`);
            return;
          }

          parsedData.push({
            barcode: String(barcode).trim(),
            name: String(name).trim(),
            category: categoryValue as ProductCategory,
            price: Number(price),
            quantity: Number(quantity),
            manufactureDate: manufactureDate,
            expirationDate: expirationDate,
            location: locationValue
          });
        });

        if (errors.length > 0) {
          setStatus('error');
          setMessage(`Найдены ошибки в данных:\n${errors.join('\n')}`);
          setPreviewData([]);
          return;
        }

        setPreviewData(parsedData);
        setStatus('idle');
        setMessage(`Загружено ${parsedData.length} товаров для импорта`);
      } catch (error) {
        console.error('❌ Ошибка парсинга файла:', error);
        setStatus('error');
        setMessage('Ошибка при чтении файла. Убедитесь, что файл имеет правильный формат.');
        setPreviewData([]);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // ✅ ОБНОВЛЁННАЯ ФУНКЦИЯ ИМПОРТА
  const handleImport = async () => {
    if (previewData.length === 0) {
      setStatus('error');
      setMessage('Нет данных для импорта');
      return;
    }

    setImporting(true);
    setProgress(0);
    setStatus('loading');
    setMessage('Импорт начался...');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // ✅ Получаем список категорий из базы данных
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoriesError) {
      console.error('❌ Ошибка получения категорий:', categoriesError);
      setStatus('error');
      setMessage('Ошибка получения категорий из базы данных');
      setImporting(false);
      return;
    }

    // ✅ Создаём карту соответствия названия категории -> ID
    const categoryMap: Record<string, string> = {};
    categories?.forEach((cat: any) => {
      categoryMap[cat.name] = cat.id;
    });

    console.log('📋 Карта категорий:', categoryMap);

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      try {
        setProgress(((i + 1) / previewData.length) * 100);

        // ✅ Получаем правильный ID категории
        const categoryId = categoryMap[row.category];
        if (!categoryId) {
          throw new Error(`Категория "${row.category}" не найдена в базе данных`);
        }

        const { data: existingProducts, error: searchError } = await supabase
          .from('products')
          .select('id, name, barcode')
          .eq('barcode', row.barcode)
          .maybeSingle();

        if (searchError) {
          throw new Error(`Ошибка поиска товара: ${searchError.message}`);
        }

        let productId: string;

        if (existingProducts) {
          productId = existingProducts.id;
          skippedCount++;
          console.log(`📦 Товар "${row.name}" уже существует, добавляем только партию`);
        } else {
          // ✅ Создаём товар с правильным category_id
          const product = await createProduct({
            barcode: row.barcode,
            name: row.name,
            category_id: categoryId,
            base_price: row.price,
            shelf_life_days: 7
          });

          if (!product || !product.id) {
            throw new Error(`Не удалось создать товар "${row.name}"`);
          }
          productId = product.id;
          successCount++;
        }

        await createBatch({
          product_id: productId,
          store_id: 'store_1',
          quantity: row.quantity,
          manufacture_date: row.manufactureDate || new Date().toISOString().split('T')[0],
          expiration_date: row.expirationDate,
          location_id: row.location || 'shelf_1'
        });

      } catch (error) {
        errorCount++;
        errors.push(`Строка ${i + 1} (${row.name}): ${(error as Error).message}`);
        console.error(`❌ Ошибка импорта строки ${i + 1}:`, error);
      }
    }

    setImporting(false);

    let resultMessage = '';
    if (successCount > 0) {
      resultMessage += `✅ Создано новых товаров: ${successCount}\n`;
    }
    if (skippedCount > 0) {
      resultMessage += `📦 Существующих товаров (добавлены партии): ${skippedCount}\n`;
    }
    if (errorCount > 0) {
      resultMessage += `❌ Ошибок: ${errorCount}\n${errors.join('\n')}`;
    }

    if (errorCount === 0) {
      setStatus('success');
      setMessage(`✅ Импорт завершён успешно!\n${resultMessage}`);
      await onImportComplete();
      setTimeout(() => onClose(), 2500);
    } else {
      setStatus('error');
      setMessage(`Импорт завершён с ошибками:\n${resultMessage}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-2xl">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-950/40 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
                Импорт товаров из Excel
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Массовое добавление товаров в систему
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Шаг 1 */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
              📋 Шаг 1: Скачайте шаблон
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Заполните файл по образцу. Обязательные поля отмечены звёздочкой (*).
            </p>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Скачать шаблон Excel</span>
            </button>
          </div>

          {/* Шаг 2 */}
          <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              📤 Шаг 2: Загрузите заполненный файл
            </h4>
            
            <div
              className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-green-500 dark:hover:border-green-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Нажмите для выбора файла или перетащите его сюда
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Поддерживаются форматы: .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {file && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>Файл загружен: {file.name}</span>
              </div>
            )}
          </div>

          {/* Статус */}
          {status !== 'idle' && (
            <div className={`rounded-xl p-4 mb-6 ${
              status === 'loading' ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30' :
              status === 'success' ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30' :
              'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
            }`}>
              <div className="flex items-start space-x-3">
                {status === 'loading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />}
                {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium whitespace-pre-wrap">{message}</p>
                  {status === 'loading' && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Предпросмотр */}
          {previewData.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                📊 Предпросмотр данных ({previewData.length} товаров)
              </h4>
              <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">#</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Штрихкод</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Название</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Категория</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Цена</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Кол-во</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Срок годности</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                        <td className="px-3 py-2 font-mono">{row.barcode}</td>
                        <td className="px-3 py-2 font-medium max-w-[150px] truncate">{row.name}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px]">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold">{row.price} ₽</td>
                        <td className="px-3 py-2">{row.quantity} шт.</td>
                        <td className="px-3 py-2 font-mono">{row.expirationDate}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-center text-gray-400">
                          ... и ещё {previewData.length - 10} товаров
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Действия */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleImport}
            disabled={previewData.length === 0 || importing}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center space-x-2 ${
              previewData.length > 0 && !importing
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Импорт...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Импортировать {previewData.length} товаров</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}