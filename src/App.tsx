import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Search,
  Download,
  SlidersHorizontal,
  Code2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowRight,
  FolderGit2,
  Link2,
  RotateCcw,
  FileCode,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  FcrmTask,
  ExtensionConfig,
  IssueStatus,
  LinkedIssueItem,
} from './types/jira';
import {
  INITIAL_FCRM_TASKS,
  DEFAULT_EXTENSION_CONFIG,
  STATUS_COLUMNS,
  SAMPLE_JIRA_ISSUE_JSON,
} from './data/fcrmMockData';
import {
  generateManifestJson,
  generateStylesCss,
  generateContentScriptJs,
  generatePopupHtml,
  generatePopupJs,
} from './utils/extensionGenerator';

type ActiveWorkspaceTab = 'board' | 'table' | 'config' | 'extension_code';
type ExtensionFileKey = 'manifest.json' | 'content.js' | 'styles.css' | 'popup.html' | 'popup.js';

export default function App() {
  const [tasks, setTasks] = useState<FcrmTask[]>(INITIAL_FCRM_TASKS);
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_EXTENSION_CONFIG);
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('board');

  // Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');

  // Task inspector & creation modals
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New link inputs inside task inspector
  const [newProjectTaskKey, setNewProjectTaskKey] = useState('');
  const [newProjectTaskSummary, setNewProjectTaskSummary] = useState('');
  const [newInProjectKey, setNewInProjectKey] = useState('');
  const [newInProjectSummary, setNewInProjectSummary] = useState('');

  // Extension code viewer state
  const [selectedCodeFile, setSelectedCodeFile] = useState<ExtensionFileKey>('content.js');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // JSON Field Detector Sandbox state
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_JIRA_ISSUE_JSON);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  // New Task form state
  const [newTaskForm, setNewTaskForm] = useState({
    key: 'FCRM-4852',
    summary: '',
    epicKey: 'FCRM-4100',
    epicName: 'Единый кредитный конвейер B2B',
    component: 'Core-Scoring',
    assigneeName: 'Алексей Смирнов',
    assigneeRole: 'Senior Go Developer',
    authorName: 'Мария Соколова',
    customerName: 'Дмитрий Волков',
    customerDept: 'Дирекция кредитования МСБ Озон Банк',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'todo' as IssueStatus,
    priority: 'Высокий' as FcrmTask['priority'],
    projectTaskKey: 'PROJ-1190',
    projectTaskSummary: 'Интеграция скоринга селлеров Ozon Банк v2',
    inProjectKey: 'FCRM-4853',
    inProjectSummary: 'Разработка REST-эндпоинта проверки лимитов',
  });

  // Unique values for filters
  const uniqueSprints = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.sprint))),
    [tasks]
  );
  const uniqueComponents = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.component))),
    [tasks]
  );
  const uniqueEpics = useMemo(
    () => Array.from(new Set(tasks.map((t) => `${t.epicKey} · ${t.epicName}`))),
    [tasks]
  );
  const uniqueCustomers = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.customer.name))),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (selectedSprint !== 'all' && t.sprint !== selectedSprint) return false;
      if (selectedComponent !== 'all' && t.component !== selectedComponent) return false;
      if (selectedEpic !== 'all' && `${t.epicKey} · ${t.epicName}` !== selectedEpic) return false;
      if (selectedCustomer !== 'all' && t.customer.name !== selectedCustomer) return false;

      if (!q) return true;
      const inLinks = [
        ...t.projectTaskLinks.map((l) => `${l.key} ${l.summary}`),
        ...t.inProjectLinks.map((l) => `${l.key} ${l.summary}`),
      ]
        .join(' ')
        .toLowerCase();

      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.epicName.toLowerCase().includes(q) ||
        t.epicKey.toLowerCase().includes(q) ||
        t.component.toLowerCase().includes(q) ||
        t.assignee.name.toLowerCase().includes(q) ||
        t.author.name.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q) ||
        t.customer.department.toLowerCase().includes(q) ||
        inLinks.includes(q)
      );
    });
  }, [tasks, searchQuery, selectedSprint, selectedComponent, selectedEpic, selectedCustomer]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.key === selectedTaskKey) || null,
    [tasks, selectedTaskKey]
  );

  // Generated extension files map
  const generatedFiles: Record<ExtensionFileKey, string> = useMemo(
    () => ({
      'manifest.json': generateManifestJson(config),
      'content.js': generateContentScriptJs(config),
      'styles.css': generateStylesCss(config),
      'popup.html': generatePopupHtml(config),
      'popup.js': generatePopupJs(config),
    }),
    [config]
  );

  // Download packaged Chrome Extension ZIP
  const handleDownloadExtensionZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      Object.entries(generatedFiles).forEach(([filename, content]) => {
        zip.file(filename, content);
      });

      const readmeText = `Ozon Bank Jira Customizer — Chrome Extension (Manifest V3)
Целевая борда: ${config.boardUrl}
RapidView ID: ${config.rapidViewId} | Project Key: ${config.projectKey}

Инструкция по установке в Google Chrome / Яндекс.Браузер / Edge:
1. Распакуйте скачанный архив ozon-bank-fcrm-jira-extension.zip в любую папку.
2. Откройте в браузере страницу chrome://extensions/
3. Включите тумблер «Режим разработчика» (Developer mode) в правом верхнем углу.
4. Нажмите кнопку «Загрузить распакованное расширение» (Load unpacked) и выберите папку с файлами.
5. Перейдите на борду ${config.boardUrl} — карточки задач автоматически обновятся в дизайн-системе Ozon Банка со всеми 10 полями и двумя блоками связей («${config.linkTypeProjectTask}» и «${config.linkTypeInProject}»).`;

      zip.file('README-INSTALL.txt', readmeText);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ozon-bank-jira-${config.projectKey.toLowerCase()}-${config.rapidViewId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCode = (filename: ExtensionFileKey) => {
    navigator.clipboard.writeText(generatedFiles[filename]);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 1800);
  };

  const handleMoveTaskStatus = (taskKey: string, newStatus: IssueStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.key === taskKey ? { ...t, status: newStatus } : t))
    );
  };

  const handleAddProjectTaskLink = (taskKey: string) => {
    if (!newProjectTaskKey.trim() || !newProjectTaskSummary.trim()) return;
    const newItem: LinkedIssueItem = {
      id: `pt-${Date.now()}`,
      key: newProjectTaskKey.trim().toUpperCase(),
      summary: newProjectTaskSummary.trim(),
      status: 'В работе',
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.key === taskKey
          ? { ...t, projectTaskLinks: [...t.projectTaskLinks, newItem] }
          : t
      )
    );
    setNewProjectTaskKey('');
    setNewProjectTaskSummary('');
  };

  const handleAddInProjectLink = (taskKey: string) => {
    if (!newInProjectKey.trim() || !newInProjectSummary.trim()) return;
    const newItem: LinkedIssueItem = {
      id: `ip-${Date.now()}`,
      key: newInProjectKey.trim().toUpperCase(),
      summary: newInProjectSummary.trim(),
      status: 'Открыто',
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.key === taskKey
          ? { ...t, inProjectLinks: [...t.inProjectLinks, newItem] }
          : t
      )
    );
    setNewInProjectKey('');
    setNewInProjectSummary('');
  };

  const handleRemoveLink = (
    taskKey: string,
    block: 'projectTaskLinks' | 'inProjectLinks',
    linkId: string
  ) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.key === taskKey
          ? { ...t, [block]: t[block].filter((l) => l.id !== linkId) }
          : t
      )
    );
  };

  const handleAutoDetectFromJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const fields = parsed.fields || parsed;
      let detectedEpic = config.epicFieldId;
      let detectedSprint = config.sprintFieldId;
      let detectedCustomer = config.customerFieldId;

      Object.entries(fields).forEach(([key, val]) => {
        if (!key.startsWith('customfield_')) return;
        const strVal = JSON.stringify(val);
        if (strVal.includes('com.atlassian.greenhopper.service.sprint.Sprint')) {
          detectedSprint = key;
        } else if (typeof val === 'string' && /^[A-Z]+-\d+$/.test(val)) {
          detectedEpic = key;
        } else if (
          key !== detectedSprint &&
          key !== detectedEpic &&
          val &&
          typeof val === 'object'
        ) {
          detectedCustomer = key;
        }
      });

      setConfig((prev) => ({
        ...prev,
        epicFieldId: detectedEpic,
        sprintFieldId: detectedSprint,
        customerFieldId: detectedCustomer,
      }));
      setDetectionMessage(
        `Успешно распознано из JSON: Эпик = ${detectedEpic}, Спринт = ${detectedSprint}, Заказчик = ${detectedCustomer}`
      );
    } catch {
      setDetectionMessage('Ошибка парсинга JSON: проверьте корректность скопированного ответа из jit.o3.ru.');
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.summary.trim()) return;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createdAt = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const created: FcrmTask = {
      key: newTaskForm.key.trim().toUpperCase() || `FCRM-${Math.floor(4850 + Math.random() * 100)}`,
      summary: newTaskForm.summary.trim(),
      epicKey: newTaskForm.epicKey.trim(),
      epicName: newTaskForm.epicName.trim(),
      component: newTaskForm.component.trim(),
      assignee: {
        name: newTaskForm.assigneeName.trim(),
        login: 'ozon_user',
        role: newTaskForm.assigneeRole.trim(),
      },
      author: {
        name: newTaskForm.authorName.trim(),
        login: 'ozon_author',
      },
      customer: {
        name: newTaskForm.customerName.trim(),
        department: newTaskForm.customerDept.trim(),
      },
      createdAt,
      sprint: newTaskForm.sprint.trim(),
      status: newTaskForm.status,
      priority: newTaskForm.priority,
      projectTaskLinks: newTaskForm.projectTaskKey.trim()
        ? [
            {
              id: `pt-${Date.now()}`,
              key: newTaskForm.projectTaskKey.trim().toUpperCase(),
              summary:
                newTaskForm.projectTaskSummary.trim() ||
                'Связанная проектная задача',
              status: 'В работе',
            },
          ]
        : [],
      inProjectLinks: newTaskForm.inProjectKey.trim()
        ? [
            {
              id: `ip-${Date.now()}`,
              key: newTaskForm.inProjectKey.trim().toUpperCase(),
              summary:
                newTaskForm.inProjectSummary.trim() || 'Задача в контуре проекта',
              status: 'Открыто',
            },
          ]
        : [],
    };

    setTasks((prev) => [created, ...prev]);
    setIsNewTaskModalOpen(false);
    setSelectedTaskKey(created.key);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSprint('all');
    setSelectedComponent('all');
    setSelectedEpic('all');
    setSelectedCustomer('all');
  };

  const activeFieldCount = [
    config.showSummary,
    config.showEpic,
    config.showComponent,
    config.showAssignee,
    config.showAuthor,
    config.showCustomer,
    config.showCreatedAt,
    config.showSprint,
    config.showProjectTaskLinks,
    config.showInProjectLinks,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#071026]">
      {/* =====================================================================
          TOP BAR CONTRACT: Strictly 1 row, 3 zones separated by gap-8
          Zone 1: Single text element Brand wordmark
          Zone 2: 4 concise single-line text nav links
          Zone 3: 1 primary CTA action button
         ===================================================================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-[#E2E8F0]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#board"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('board');
          }}
          className="text-lg font-bold tracking-tight text-[#071026] whitespace-nowrap shrink-0 font-display"
        >
          Ozon Bank · Jira FCRM
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-[#475569] overflow-x-auto">
          <a
            href="#board"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('board');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'board'
                ? 'text-[#005BFF] border-[#005BFF] font-semibold'
                : 'border-transparent hover:text-[#071026] hover:underline'
            }`}
          >
            Канбан FCRM
          </a>
          <a
            href="#table"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('table');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'table'
                ? 'text-[#005BFF] border-[#005BFF] font-semibold'
                : 'border-transparent hover:text-[#071026] hover:underline'
            }`}
          >
            Реестр задач
          </a>
          <a
            href="#config"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('config');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'config'
                ? 'text-[#005BFF] border-[#005BFF] font-semibold'
                : 'border-transparent hover:text-[#071026] hover:underline'
            }`}
          >
            Настройка полей
          </a>
          <a
            href="#extension_code"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('extension_code');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'extension_code'
                ? 'text-[#005BFF] border-[#005BFF] font-semibold'
                : 'border-transparent hover:text-[#071026] hover:underline'
            }`}
          >
            Код расширения
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handleDownloadExtensionZip}
            disabled={isZipping}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Сборка архива...' : 'Скачать расширение .ZIP'}</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          WORKSPACE SUB-HEADER & TARGET BOARD CONTEXT BAR
         ===================================================================== */}
      <section className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
              <span className="font-semibold text-[#005BFF]">Дизайн-система Ozon Банка</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">rapidView={config.rapidViewId}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">projectKey={config.projectKey}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Активных полей карточки: {activeFieldCount} из 10</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#071026] font-display">
              Кастомный визуал доски {config.projectKey} (jit.o3.ru)
            </h1>
          </div>

          {/* Interactive Workspace Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={config.boardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#071026] bg-[#F5F7FA] hover:bg-[#EBF2FF] hover:text-[#005BFF] border border-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span className="font-mono">jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#005BFF] bg-[#EBF2FF] hover:bg-[#DBE8FF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить тестовую задачу</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FILTER & FIELD VISIBILITY BAR (Shown on Board & Table views)
         ===================================================================== */}
      {(activeTab === 'board' || activeTab === 'table') && (
        <section className="bg-white/80 backdrop-blur-xs border-b border-[#E2E8F0] px-6 py-3">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по ключу FCRM, названию, заказчику, эпику или связям..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] placeholder:text-[#64748B] focus:outline-none focus:border-[#005BFF] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071026] cursor-pointer"
                    title="Очистить поиск"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSprint}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                  aria-label="Фильтр по спринту"
                  className="px-3 py-1.5 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] focus:outline-none focus:border-[#005BFF] cursor-pointer"
                >
                  <option value="all">Все спринты ({uniqueSprints.length})</option>
                  {uniqueSprints.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedComponent}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                  aria-label="Фильтр по компоненту"
                  className="px-3 py-1.5 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] focus:outline-none focus:border-[#005BFF] cursor-pointer"
                >
                  <option value="all">Все компоненты ({uniqueComponents.length})</option>
                  {uniqueComponents.map((c) => (
                    <option key={c} value={c}>
                      Компонент: {c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedEpic}
                  onChange={(e) => setSelectedEpic(e.target.value)}
                  aria-label="Фильтр по эпику"
                  className="px-3 py-1.5 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] focus:outline-none focus:border-[#005BFF] cursor-pointer max-w-[230px] truncate"
                >
                  <option value="all">Все эпики ({uniqueEpics.length})</option>
                  {uniqueEpics.map((ep) => (
                    <option key={ep} value={ep}>
                      {ep}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  aria-label="Фильтр по заказчику"
                  className="px-3 py-1.5 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] focus:outline-none focus:border-[#005BFF] cursor-pointer"
                >
                  <option value="all">Все заказчики ({uniqueCustomers.length})</option>
                  {uniqueCustomers.map((cust) => (
                    <option key={cust} value={cust}>
                      Заказчик: {cust}
                    </option>
                  ))}
                </select>

                {(searchQuery ||
                  selectedSprint !== 'all' ||
                  selectedComponent !== 'all' ||
                  selectedEpic !== 'all' ||
                  selectedCustomer !== 'all') && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#F91155] hover:bg-[#FFF0F5] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Field Toggles Strip (Functional buttons to preview extension layout live) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#64748B] mr-1">
                  Отображаемые поля карточки:
                </span>
                {(
                  [
                    { key: 'showSummary', label: '1. Название задачи' },
                    { key: 'showEpic', label: '2. Эпик' },
                    { key: 'showComponent', label: '3. Компонент' },
                    { key: 'showAssignee', label: '4. Исполнитель' },
                    { key: 'showAuthor', label: '5. Автор' },
                    { key: 'showCustomer', label: '6. Заказчик' },
                    { key: 'showCreatedAt', label: '7. Дата создания' },
                    { key: 'showSprint', label: '8. Спринт' },
                    { key: 'showProjectTaskLinks', label: `9. Связи «${config.linkTypeProjectTask}»` },
                    { key: 'showInProjectLinks', label: `10. Связи «${config.linkTypeInProject}»` },
                  ] as { key: keyof ExtensionConfig; label: string }[]
                ).map((item) => {
                  const isActive = Boolean(config[item.key]);
                  return (
                    <button
                      key={item.key}
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#005BFF] text-white'
                          : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#071026]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, compactMode: !prev.compactMode }))
                }
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  config.compactMode
                    ? 'bg-[#071026] text-white border-[#071026]'
                    : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#005BFF]'
                }`}
              >
                {config.compactMode ? 'Режим: Компактный' : 'Режим: Стандартный Ozon Bank'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAIN WORKSPACE CONTENT AREA
         ===================================================================== */}
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full mx-auto">
        {/* -------------------------------------------------------------------
            VIEW 1: KANBAN BOARD PREVIEW (FCRM #9349)
           ------------------------------------------------------------------- */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center max-w-lg mx-auto my-8">
                <p className="text-base font-semibold text-[#071026] mb-1">
                  По выбранным фильтрам задачи не найдены
                </p>
                <p className="text-xs text-[#64748B] mb-4">
                  Попробуйте сбросить параметры фильтрации или добавьте новую задачу в доску FCRM.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] transition-colors cursor-pointer"
                >
                  Сбросить все фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
                {STATUS_COLUMNS.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id);
                  return (
                    <div
                      key={col.id}
                      className="bg-[#EEF2F7] border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-3 min-h-[620px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1 pb-2 border-b-2 border-[#005BFF]">
                        <div>
                          <h2 className="text-xs font-bold text-[#071026] tracking-tight">
                            {col.title}
                          </h2>
                          <p className="text-[11px] text-[#64748B] font-mono">
                            {col.jiraStatusName}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#005BFF] tabular-nums">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Column Cards */}
                      <div className="flex flex-col gap-3">
                        {colTasks.length === 0 ? (
                          <div className="py-10 px-4 text-center border border-dashed border-[#CBD5E1] rounded-lg text-xs text-[#64748B]">
                            Нет задач в статусе «{col.title}»
                          </div>
                        ) : (
                          colTasks.map((task) => (
                            <article
                              key={task.key}
                              onClick={() => setSelectedTaskKey(task.key)}
                              className={`bg-white border border-[#E2E8F0] hover:border-[#005BFF] rounded-xl transition-all cursor-pointer flex flex-col ${
                                config.compactMode ? 'p-3 gap-2' : 'p-4 gap-3'
                              }`}
                            >
                              {/* Top Row: Key · Priority · Created Date */}
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#005BFF] hover:underline">
                                    {task.key}
                                  </span>
                                  <span className="text-[#CBD5E1]" aria-hidden="true">
                                    ·
                                  </span>
                                  <span
                                    className={`text-[11px] font-medium ${
                                      task.priority === 'Критический'
                                        ? 'text-[#F91155] font-semibold'
                                        : task.priority === 'Высокий'
                                        ? 'text-[#D97706]'
                                        : 'text-[#64748B]'
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>
                                {config.showCreatedAt && (
                                  <span
                                    className="font-mono text-[11px] text-[#64748B] tabular-nums"
                                    title="Дата создания задачи"
                                  >
                                    {task.createdAt}
                                  </span>
                                )}
                              </div>

                              {/* 1. Название задачи */}
                              {config.showSummary && (
                                <h3
                                  className={`font-semibold text-[#071026] leading-snug ${
                                    config.compactMode ? 'text-xs' : 'text-[13.5px]'
                                  }`}
                                >
                                  {task.summary}
                                </h3>
                              )}

                              {/* 2. Эпик · 3. Компонент · 8. Спринт (Zero-Pill clean unboxed metadata with · separators) */}
                              {(config.showEpic || config.showComponent || config.showSprint) && (
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-[#475569] pt-2 border-t border-[#F1F5F9]">
                                  {config.showEpic && (
                                    <span className="font-semibold text-[#005BFF]">
                                      Эпик: {task.epicKey} ({task.epicName})
                                    </span>
                                  )}
                                  {config.showEpic &&
                                    (config.showComponent || config.showSprint) && (
                                      <span className="text-[#CBD5E1]" aria-hidden="true">
                                        ·
                                      </span>
                                    )}
                                  {config.showComponent && (
                                    <span>
                                      Компонент:{' '}
                                      <strong className="font-semibold text-[#071026]">
                                        {task.component}
                                      </strong>
                                    </span>
                                  )}
                                  {config.showComponent && config.showSprint && (
                                    <span className="text-[#CBD5E1]" aria-hidden="true">
                                      ·
                                    </span>
                                  )}
                                  {config.showSprint && (
                                    <span className="text-[#64748B] tabular-nums">
                                      {task.sprint}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 4. Исполнитель · 5. Автор · 6. Заказчик */}
                              {(config.showAssignee ||
                                config.showAuthor ||
                                config.showCustomer) && (
                                <div className="bg-[#F8FAFC] border border-[#EEF2F6] rounded-lg p-2.5 flex flex-col gap-1.5 text-[11.5px]">
                                  {config.showAssignee && (
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="text-[#64748B] shrink-0">
                                        Исполнитель:
                                      </span>
                                      <span className="font-semibold text-[#071026] text-right truncate">
                                        {task.assignee.name}
                                      </span>
                                    </div>
                                  )}
                                  {config.showAuthor && (
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="text-[#64748B] shrink-0">Автор:</span>
                                      <span className="font-medium text-[#334155] text-right truncate">
                                        {task.author.name}
                                      </span>
                                    </div>
                                  )}
                                  {config.showCustomer && (
                                    <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-[#E2E8F0]/70">
                                      <span className="text-[#64748B] shrink-0">Заказчик:</span>
                                      <span
                                        className="font-semibold text-[#004ED6] text-right truncate"
                                        title={`${task.customer.name} — ${task.customer.department}`}
                                      >
                                        {task.customer.name} · {task.customer.department}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 9 & 10. Два блока связей: «Задача проекта» и «В проекте» */}
                              {(config.showProjectTaskLinks || config.showInProjectLinks) && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                                  {/* Блок связей 1: «Задача проекта» */}
                                  {config.showProjectTaskLinks && (
                                    <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg p-2">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-[#334155] mb-1.5">
                                        <span className="inline-flex items-center gap-1">
                                          <FolderGit2 className="w-3 h-3 text-[#005BFF]" />
                                          <span>{config.linkTypeProjectTask}</span>
                                        </span>
                                        <span className="font-mono text-[10.5px] text-[#64748B] tabular-nums">
                                          {task.projectTaskLinks.length}
                                        </span>
                                      </div>
                                      {task.projectTaskLinks.length === 0 ? (
                                        <p className="text-[11px] text-[#94A3B8]">
                                          Нет связанных проектных задач
                                        </p>
                                      ) : (
                                        <div className="flex flex-col divide-y divide-[#EEF2F6]">
                                          {task.projectTaskLinks.map((link) => (
                                            <div
                                              key={link.id}
                                              className="py-1 first:pt-0 last:pb-0 flex items-baseline justify-between gap-1.5 text-[11px]"
                                            >
                                              <span className="font-mono font-semibold text-[#005BFF] shrink-0">
                                                {link.key}
                                              </span>
                                              <span
                                                className="text-[#071026] truncate flex-1"
                                                title={link.summary}
                                              >
                                                {link.summary}
                                              </span>
                                              <span className="text-[10px] text-[#64748B] shrink-0">
                                                {link.status}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Блок связей 2: «В проекте» */}
                                  {config.showInProjectLinks && (
                                    <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg p-2">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-[#334155] mb-1.5">
                                        <span className="inline-flex items-center gap-1">
                                          <Link2 className="w-3 h-3 text-[#005BFF]" />
                                          <span>{config.linkTypeInProject}</span>
                                        </span>
                                        <span className="font-mono text-[10.5px] text-[#64748B] tabular-nums">
                                          {task.inProjectLinks.length}
                                        </span>
                                      </div>
                                      {task.inProjectLinks.length === 0 ? (
                                        <p className="text-[11px] text-[#94A3B8]">
                                          Нет задач в блоке «{config.linkTypeInProject}»
                                        </p>
                                      ) : (
                                        <div className="flex flex-col divide-y divide-[#EEF2F6]">
                                          {task.inProjectLinks.map((link) => (
                                            <div
                                              key={link.id}
                                              className="py-1 first:pt-0 last:pb-0 flex items-baseline justify-between gap-1.5 text-[11px]"
                                            >
                                              <span className="font-mono font-semibold text-[#005BFF] shrink-0">
                                                {link.key}
                                              </span>
                                              <span
                                                className="text-[#071026] truncate flex-1"
                                                title={link.summary}
                                              >
                                                {link.summary}
                                              </span>
                                              <span className="text-[10px] text-[#64748B] shrink-0">
                                                {link.status}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            VIEW 2: HIGH-DENSITY TABLE REGISTRY VIEW (All 10 Fields)
           ------------------------------------------------------------------- */}
        {activeTab === 'table' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#071026] font-display">
                  Полный реестр задач доски {config.projectKey} (RapidView #{config.rapidViewId})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Табличное представление всех 10 обязательных атрибутов и связанных блоков «{config.linkTypeProjectTask}» / «{config.linkTypeInProject}»
                </p>
              </div>
              <span className="text-xs font-mono text-[#64748B] tabular-nums">
                Показано записей: {filteredTasks.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Ключ и название задачи</th>
                    <th className="py-3 px-3 whitespace-nowrap">Эпик / Компонент</th>
                    <th className="py-3 px-3 whitespace-nowrap">Исполнитель / Автор</th>
                    <th className="py-3 px-3 whitespace-nowrap">Заказчик</th>
                    <th className="py-3 px-3 whitespace-nowrap">Дата создания / Спринт</th>
                    <th className="py-3 px-3 whitespace-nowrap">
                      Связи: «{config.linkTypeProjectTask}»
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      Связи: «{config.linkTypeInProject}»
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.key}
                      onClick={() => setSelectedTaskKey(task.key)}
                      className="hover:bg-[#F5F7FA] transition-colors cursor-pointer align-top"
                    >
                      <td className="py-3.5 px-4 max-w-[290px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-[#005BFF]">
                            {task.key}
                          </span>
                          <span className="text-[#CBD5E1]">·</span>
                          <span className="text-[11px] text-[#64748B]">
                            {STATUS_COLUMNS.find((c) => c.id === task.status)?.title}
                          </span>
                        </div>
                        <p className="font-semibold text-[#071026] leading-snug">
                          {task.summary}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-[#005BFF]">
                          {task.epicKey} · {task.epicName}
                        </div>
                        <div className="text-[#475569] mt-0.5">
                          Компонент: <strong className="text-[#071026]">{task.component}</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-[#071026] font-semibold">
                          Исп: {task.assignee.name}
                        </div>
                        <div className="text-[#64748B] mt-0.5">
                          Авт: {task.author.name}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 max-w-[220px]">
                        <div className="font-semibold text-[#004ED6]">
                          {task.customer.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] leading-tight mt-0.5">
                          {task.customer.department}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-[#071026]">
                          {task.createdAt}
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                          {task.sprint}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 max-w-[240px]">
                        <div className="flex flex-col gap-1">
                          {task.projectTaskLinks.map((l) => (
                            <div key={l.id} className="text-[11px] leading-tight">
                              <span className="font-mono font-semibold text-[#005BFF]">
                                {l.key}
                              </span>{' '}
                              <span className="text-[#071026]">{l.summary}</span>{' '}
                              <span className="text-[#64748B]">({l.status})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="flex flex-col gap-1">
                          {task.inProjectLinks.map((l) => (
                            <div key={l.id} className="text-[11px] leading-tight">
                              <span className="font-mono font-semibold text-[#005BFF]">
                                {l.key}
                              </span>{' '}
                              <span className="text-[#071026]">{l.summary}</span>{' '}
                              <span className="text-[#64748B]">({l.status})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            VIEW 3: FIELD MAPPING & JIT.O3.RU REST API CONFIGURATOR
           ------------------------------------------------------------------- */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Custom field IDs & visual geometry */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h2 className="text-lg font-bold text-[#071026] font-display">
                  01. Маппинг полей Jira REST API (jit.o3.ru)
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Расширение обращается к <code className="font-mono text-[#005BFF]">/rest/api/2/issue/FCRM-XXXX</code> от имени текущей сессии пользователя и подтягивает кастомные поля и блоки связей.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    ID доски (rapidView)
                  </label>
                  <input
                    type="text"
                    value={config.rapidViewId}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, rapidViewId: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Ключ проекта (projectKey)
                  </label>
                  <input
                    type="text"
                    value={config.projectKey}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, projectKey: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Поле «Заказчик» (Custom Field ID)
                  </label>
                  <input
                    type="text"
                    value={config.customerFieldId}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, customerFieldId: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    В Jira Ozon обычно <code className="font-mono">customfield_14201</code> или аналогичный справочник
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Поле «Эпик» (Epic Link Field ID)
                  </label>
                  <input
                    type="text"
                    value={config.epicFieldId}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, epicFieldId: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Поле «Спринт» (Sprint Field ID)
                  </label>
                  <input
                    type="text"
                    value={config.sprintFieldId}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, sprintFieldId: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Мин. ширина колонки RapidBoard (px)
                  </label>
                  <input
                    type="number"
                    min={260}
                    max={520}
                    value={config.columnMinWidthPx}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        columnMinWidthPx: Number(e.target.value) || 340,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Тип связей №1 («Задача проекта»)
                  </label>
                  <input
                    type="text"
                    value={config.linkTypeProjectTask}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        linkTypeProjectTask: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#071026] mb-1">
                    Тип связей №2 («В проекте»)
                  </label>
                  <input
                    type="text"
                    value={config.linkTypeInProject}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        linkTypeInProject: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs text-[#64748B]">
                  Все изменения мгновенно пересобирают <code className="font-mono">content.js</code> и <code className="font-mono">styles.css</code>.
                </span>
                <button
                  onClick={() => setActiveTab('extension_code')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] transition-colors cursor-pointer"
                >
                  <span>Перейти к коду расширения</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Auto-Detector from real jit.o3.ru JSON */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#071026] font-display">
                  02. Автоопределение ID полей из JSON ответа jit.o3.ru
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Откройте в браузере <code className="font-mono text-[#005BFF]">https://jit.o3.ru/rest/api/2/issue/FCRM-XXXX</code>, вставьте фрагмент JSON ниже, и конструктор автоматически вычислит ID полей Спринта, Эпика и Заказчика.
                </p>
              </div>

              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full p-3 text-[11px] font-mono bg-[#071026] text-[#E2E8F0] rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#005BFF]"
              />

              {detectionMessage && (
                <div className="p-3 rounded-lg bg-[#EBF2FF] border border-[#005BFF]/20 text-xs font-medium text-[#004ED6]">
                  {detectionMessage}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setJsonInput(SAMPLE_JIRA_ISSUE_JSON);
                    setDetectionMessage(null);
                  }}
                  className="px-3 py-2 text-xs font-medium text-[#475569] hover:text-[#071026] cursor-pointer"
                >
                  Восстановить пример FCRM-4821
                </button>

                <button
                  onClick={handleAutoDetectFromJson}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Определить ID полей</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            VIEW 4: CHROME EXTENSION SOURCE CODE & INSTALLATION GUIDE
           ------------------------------------------------------------------- */}
        {activeTab === 'extension_code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Installation Steps */}
            <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#071026] font-display">
                  Установка расширения в Chrome
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Готовый пакет Manifest V3 для доски <code className="font-mono">rapidView=9349&projectKey=FCRM</code>
                </p>
              </div>

              <ol className="space-y-3 text-xs text-[#334155]">
                <li className="p-3 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6]">
                  <div className="font-bold text-[#071026] mb-0.5">
                    01. Скачайте и распакуйте ZIP-архив
                  </div>
                  Нажмите кнопку «Скачать расширение .ZIP» в правом верхнем углу и распакуйте архив в отдельную папку.
                </li>
                <li className="p-3 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6]">
                  <div className="font-bold text-[#071026] mb-0.5">
                    02. Откройте управление расширениями
                  </div>
                  Перейдите по адресу <code className="font-mono text-[#005BFF]">chrome://extensions/</code> и включите переключатель «Режим разработчика» (Developer mode).
                </li>
                <li className="p-3 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6]">
                  <div className="font-bold text-[#071026] mb-0.5">
                    03. Загрузите распакованное расширение
                  </div>
                  Нажмите «Загрузить распакованное расширение» (Load unpacked) и укажите папку с файлами <code className="font-mono">manifest.json</code> и <code className="font-mono">content.js</code>.
                </li>
                <li className="p-3 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6]">
                  <div className="font-bold text-[#071026] mb-0.5">
                    04. Откройте борду FCRM на jit.o3.ru
                  </div>
                  Перейдите на <code className="font-mono text-[#005BFF]">jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349&projectKey=FCRM#</code>. Скрипт автоматически обогатит каждую карточку.
                </li>
              </ol>

              <button
                onClick={handleDownloadExtensionZip}
                disabled={isZipping}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать готовый архив расширения (.ZIP)</span>
              </button>
            </div>

            {/* Source Code Viewer */}
            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      'content.js',
                      'styles.css',
                      'manifest.json',
                      'popup.html',
                      'popup.js',
                    ] as ExtensionFileKey[]
                  ).map((fileKey) => (
                    <button
                      key={fileKey}
                      onClick={() => setSelectedCodeFile(fileKey)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                        selectedCodeFile === fileKey
                          ? 'bg-[#005BFF] text-white'
                          : 'bg-white text-[#475569] border border-[#E2E8F0] hover:text-[#071026]'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{fileKey}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopyCode(selectedCodeFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#071026] bg-white border border-[#E2E8F0] hover:border-[#005BFF] rounded-lg transition-colors cursor-pointer"
                >
                  {copiedFile === selectedCodeFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать {selectedCodeFile}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-5 bg-[#071026] text-[#E2E8F0] text-xs font-mono overflow-x-auto max-h-[640px] leading-relaxed">
                <code>{generatedFiles[selectedCodeFile]}</code>
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          SLIDE-OVER TASK INSPECTOR (View & Edit all 10 fields + Add/Remove links)
         ===================================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-40 bg-[#071026]/40 backdrop-blur-[1px] flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Drawer Top Bar */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span className="font-mono font-bold text-[#005BFF] text-sm">
                      {selectedTask.key}
                    </span>
                    <span>·</span>
                    <span>Создано: <strong className="font-mono tabular-nums text-[#071026]">{selectedTask.createdAt}</strong></span>
                  </div>
                  <h2 className="text-lg font-bold text-[#071026] mt-1 font-display leading-snug">
                    {selectedTask.summary}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTaskKey(null)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#071026] hover:bg-[#F5F7FA] cursor-pointer"
                  aria-label="Закрыть карточку"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Switcher */}
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-2">
                  Статус на доске RapidBoard #9349:
                </label>
                <div className="flex flex-wrap gap-1.5 p-1 bg-[#F5F7FA] rounded-lg border border-[#E2E8F0]">
                  {STATUS_COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleMoveTaskStatus(selectedTask.key, col.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        selectedTask.status === col.id
                          ? 'bg-[#005BFF] text-white'
                          : 'text-[#475569] hover:text-[#071026]'
                      }`}
                    >
                      {col.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* All 8 Core Attributes Grid */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[#64748B] mb-0.5">2. Эпик</div>
                  <div className="font-semibold text-[#005BFF]">
                    {selectedTask.epicKey} · {selectedTask.epicName}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-0.5">3. Компонент</div>
                  <div className="font-semibold text-[#071026]">
                    {selectedTask.component}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-0.5">4. Исполнитель</div>
                  <div className="font-semibold text-[#071026]">
                    {selectedTask.assignee.name} ({selectedTask.assignee.role})
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-0.5">5. Автор</div>
                  <div className="font-semibold text-[#071026]">
                    {selectedTask.author.name} ({selectedTask.author.login})
                  </div>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
                  <div className="text-[#64748B] mb-0.5">6. Заказчик</div>
                  <div className="font-semibold text-[#004ED6]">
                    {selectedTask.customer.name} — {selectedTask.customer.department}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-0.5">7. Дата создания</div>
                  <div className="font-mono font-semibold tabular-nums text-[#071026]">
                    {selectedTask.createdAt}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-0.5">8. Спринт</div>
                  <div className="font-semibold tabular-nums text-[#071026]">
                    {selectedTask.sprint}
                  </div>
                </div>
              </div>

              {/* Block 9: Связи «Задача проекта» */}
              <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#071026] flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-[#005BFF]" />
                    <span>9. Блок связей «{config.linkTypeProjectTask}»</span>
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#005BFF] tabular-nums">
                    {selectedTask.projectTaskLinks.length}
                  </span>
                </div>

                <div className="divide-y divide-[#EEF2F6]">
                  {selectedTask.projectTaskLinks.map((link) => (
                    <div
                      key={link.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-bold text-[#005BFF] mr-2">
                          {link.key}
                        </span>
                        <span className="text-[#071026] font-medium">
                          {link.summary}
                        </span>
                        <span className="text-[#64748B] ml-2">({link.status})</span>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveLink(
                            selectedTask.key,
                            'projectTaskLinks',
                            link.id
                          )
                        }
                        className="text-[#94A3B8] hover:text-[#F91155] p-1 cursor-pointer"
                        title="Удалить связь"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new Project Task link */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#F1F5F9]">
                  <input
                    type="text"
                    placeholder="Ключ (напр. PROJ-1204)"
                    value={newProjectTaskKey}
                    onChange={(e) => setNewProjectTaskKey(e.target.value)}
                    className="sm:w-36 px-2.5 py-1.5 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF]"
                  />
                  <input
                    type="text"
                    placeholder="Название связанной задачи проекта..."
                    value={newProjectTaskSummary}
                    onChange={(e) => setNewProjectTaskSummary(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF]"
                  />
                  <button
                    onClick={() => handleAddProjectTaskLink(selectedTask.key)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] shrink-0 cursor-pointer"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Block 10: Связи «В проекте» */}
              <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#071026] flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-[#005BFF]" />
                    <span>10. Блок связей «{config.linkTypeInProject}»</span>
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#005BFF] tabular-nums">
                    {selectedTask.inProjectLinks.length}
                  </span>
                </div>

                <div className="divide-y divide-[#EEF2F6]">
                  {selectedTask.inProjectLinks.map((link) => (
                    <div
                      key={link.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-bold text-[#005BFF] mr-2">
                          {link.key}
                        </span>
                        <span className="text-[#071026] font-medium">
                          {link.summary}
                        </span>
                        <span className="text-[#64748B] ml-2">({link.status})</span>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveLink(selectedTask.key, 'inProjectLinks', link.id)
                        }
                        className="text-[#94A3B8] hover:text-[#F91155] p-1 cursor-pointer"
                        title="Удалить связь"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new In-Project link */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#F1F5F9]">
                  <input
                    type="text"
                    placeholder="Ключ (напр. FCRM-4890)"
                    value={newInProjectKey}
                    onChange={(e) => setNewInProjectKey(e.target.value)}
                    className="sm:w-36 px-2.5 py-1.5 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF]"
                  />
                  <input
                    type="text"
                    placeholder="Название задачи в проекте..."
                    value={newInProjectSummary}
                    onChange={(e) => setNewInProjectSummary(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#005BFF]"
                  />
                  <button
                    onClick={() => handleAddInProjectLink(selectedTask.key)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] shrink-0 cursor-pointer"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
              <a
                href={`https://jit.o3.ru/browse/${selectedTask.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005BFF] hover:underline"
              >
                <span>Открыть {selectedTask.key} в jit.o3.ru</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedTaskKey(null)}
                className="px-4 py-2 text-xs font-semibold text-[#071026] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CREATE NEW FCRM TASK MODAL
         ===================================================================== */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#071026]/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-lg font-bold text-[#071026] font-display">
                Добавить тестовую задачу на доску FCRM
              </h2>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#071026] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Ключ задачи
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskForm.key}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, key: e.target.value }))
                    }
                    className="w-full px-3 py-2 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#071026] mb-1">
                    1. Название задачи (Summary) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Реализация скоринга гарантий МСБ в FCRM..."
                    value={newTaskForm.summary}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, summary: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    2. Ключ эпика
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.epicKey}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, epicKey: e.target.value }))
                    }
                    className="w-full px-3 py-2 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Название эпика
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.epicName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, epicName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    3. Компонент
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.component}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, component: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    4. Исполнитель
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.assigneeName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, assigneeName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    5. Автор
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.authorName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, authorName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    8. Спринт
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.sprint}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, sprint: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    6. Заказчик (ФИО)
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.customerName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, customerName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Подразделение заказчика в Ozon Банке
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.customerDept}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, customerDept: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    9. Связь «{config.linkTypeProjectTask}» (Ключ и название)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskForm.projectTaskKey}
                      onChange={(e) =>
                        setNewTaskForm((p) => ({
                          ...p,
                          projectTaskKey: e.target.value,
                        }))
                      }
                      className="w-28 px-2.5 py-2 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                    />
                    <input
                      type="text"
                      value={newTaskForm.projectTaskSummary}
                      onChange={(e) =>
                        setNewTaskForm((p) => ({
                          ...p,
                          projectTaskSummary: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    10. Связь «{config.linkTypeInProject}» (Ключ и название)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskForm.inProjectKey}
                      onChange={(e) =>
                        setNewTaskForm((p) => ({ ...p, inProjectKey: e.target.value }))
                      }
                      className="w-28 px-2.5 py-2 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                    />
                    <input
                      type="text"
                      value={newTaskForm.inProjectSummary}
                      onChange={(e) =>
                        setNewTaskForm((p) => ({
                          ...p,
                          inProjectSummary: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] hover:text-[#071026] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#005BFF] rounded-lg hover:bg-[#004ED6] cursor-pointer"
                >
                  Создать карточку на доске
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
