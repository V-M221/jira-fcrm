import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Search,
  Download,
  Plus,
  ExternalLink,
  X,
  FolderGit2,
  Link2,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  GripVertical,
  Check,
  HelpCircle,
  Copy,
  Paperclip,
  UserX,
} from 'lucide-react';
import {
  FcrmTask,
  ExtensionConfig,
  IssueStatus,
  LinkedIssueItem,
  ProjectIssueType,
} from './types/jira';
import {
  INITIAL_FCRM_TASKS,
  DEFAULT_EXTENSION_CONFIG,
  STATUS_COLUMNS,
  FCRM_UMB_EPIC_TASKS,
  FCRM_UMB_EPIC_JQL_URL,
} from './data/fcrmMockData';
import {
  generateManifestJson,
  generateStylesCss,
  generateContentScriptJs,
  generatePopupHtml,
  generatePopupJs,
} from './utils/extensionGenerator';

const DEFAULT_COMPONENT_OPTIONS = [
  'CRM: Поддержка (Развитие)',
  'CRM: Поддержка (Продукт)',
  'Роли и доступы',
  'Core-Scoring',
  'KYC-Verify',
  'Corp-Cards',
  'CRM-DocGen',
  'AntiFraud-UI',
];

const PROJECT_ISSUE_TYPES: ProjectIssueType[] = [
  'Задача',
  'История',
  'Эпик',
  'Ошибка',
  'Аналитика',
];

function isCanceledStatusValue(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === 'canceled' ||
    s === 'cancelled' ||
    s === 'отменено' ||
    s === 'отменён' ||
    s === 'отменена' ||
    s === 'отклонено' ||
    s.includes('cancel') ||
    s.includes('отмен')
  );
}

function isEpicIssueTypeValue(issueType?: string): boolean {
  if (!issueType) return false;
  const t = issueType.trim().toLowerCase();
  return t === 'эпик' || t === 'epic' || t.includes('эпик') || t.includes('epic');
}

function getPriorityWeight(priority?: string): number {
  const p = (priority || '').toLowerCase();
  if (p.includes('критич') || p.includes('blocker') || p.includes('critical')) return 50;
  if (p.includes('высок') || p.includes('high') || p.includes('major')) return 40;
  if (p.includes('средн') || p.includes('стандарт') || p.includes('medium')) return 30;
  if (p.includes('низк') || p.includes('low') || p.includes('minor')) return 20;
  return 30;
}

function parseCreatedAtTimestamp(createdAt?: string): number {
  if (!createdAt) return 0;
  const m = createdAt.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0)
    ).getTime();
  }
  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function renderIssueTypeBadge(issueType?: string) {
  const label = issueType || 'Задача';
  const low = label.toLowerCase();
  let badgeStyle = 'bg-[#E5F0FF] text-[#005BFF] border-[#BFDBFE]';
  let symbol = '✓';
  if (low.includes('эпик') || low.includes('epic')) {
    badgeStyle = 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
    symbol = '⚡';
  } else if (low.includes('истор') || low.includes('story')) {
    badgeStyle = 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
    symbol = '⚑';
  } else if (low.includes('ошиб') || low.includes('баг') || low.includes('bug')) {
    badgeStyle = 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]';
    symbol = '●';
  } else if (low.includes('аналит')) {
    badgeStyle = 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]';
    symbol = '◆';
  }
  return (
    <span
      title={`Тип задачи: ${label}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[4px] text-[10px] font-bold border shrink-0 leading-tight ${badgeStyle}`}
    >
      <span>{symbol}</span>
      <span>{label}</span>
    </span>
  );
}

type ColumnId =
  | 'task'
  | 'status'
  | 'epic'
  | 'component'
  | 'assignee'
  | 'author'
  | 'customer'
  | 'createdAt'
  | 'sprint'
  | 'projectTaskLinks'
  | 'inProjectLinks';

const INITIAL_COLUMN_WIDTHS: Record<ColumnId, number> = {
  task: 330,
  status: 115,
  epic: 185,
  component: 152,
  assignee: 140,
  author: 125,
  customer: 175,
  createdAt: 112,
  sprint: 152,
  projectTaskLinks: 195,
  inProjectLinks: 235,
};

export default function App() {
  const [tasks, setTasks] = useState<FcrmTask[]>(INITIAL_FCRM_TASKS);
  const [umbEpicCatalog, setUmbEpicCatalog] =
    useState<LinkedIssueItem[]>(FCRM_UMB_EPIC_TASKS);
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_EXTENSION_CONFIG);
  const [isFieldConfigOpen, setIsFieldConfigOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [copiedChromeUrl, setCopiedChromeUrl] = useState(false);

  // Resizable Table Columns state
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(
    INITIAL_COLUMN_WIDTHS
  );
  const [activeResizingCol, setActiveResizingCol] = useState<ColumnId | null>(null);
  const colResizeRef = useRef<{
    colId: ColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startColumnResize = useCallback(
    (e: React.MouseEvent, colId: ColumnId) => {
      e.preventDefault();
      e.stopPropagation();
      colResizeRef.current = {
        colId,
        startX: e.clientX,
        startWidth: columnWidths[colId],
      };
      setActiveResizingCol(colId);
    },
    [columnWidths]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!colResizeRef.current) return;
      const { colId, startX, startWidth } = colResizeRef.current;
      const delta = e.clientX - startX;
      const minW = colId === 'task' ? 180 : 75;
      const nextWidth = Math.max(minW, Math.min(800, startWidth + delta));
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      if (colResizeRef.current) {
        colResizeRef.current = null;
        setActiveResizingCol(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Filter & Sort controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [hideEpicTasks, setHideEpicTasks] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'default' | 'priority_desc' | 'priority_asc' | 'created_desc' | 'created_asc'
  >('default');

  // Structure Sprint Accordion collapse state & loading simulation per spec
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});
  const [loadingSprints, setLoadingSprints] = useState<Record<string, boolean>>({});
  const [expandedTaskRows, setExpandedTaskRows] = useState<Record<string, boolean>>({
    'FCRM-4821': true,
  });

  // Sidebar Accordion states (matching Spec 2: Accordion Default/Hover/Active/Focus/Load)
  const [openSidebarSections, setOpenSidebarSections] = useState({
    attributes: true,
    projectTasks: true,
    inProjectTasks: true,
  });

  // Task inspector & creation modals
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>('FCRM-4821');
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Quick-picker search filter for JQL: labels = fcrm_umb_epic (по умолчанию закрыт)
  const [umbSearchQuery, setUmbSearchQuery] = useState('');
  const [isUmbPickerOpen, setIsUmbPickerOpen] = useState(false);

  // Resizable Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState<number>(490);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const isResizingRef = useRef<boolean>(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsDraggingSidebar(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.max(320, Math.min(newWidth, Math.floor(window.innerWidth * 0.78)));
      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsDraggingSidebar(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const toggleSidebarExpandPreset = () => {
    setSidebarWidth((prev) => (prev < 640 ? 760 : 490));
  };

  // Inline cell editing for text fields in Structure Table
  const [editingCell, setEditingCell] = useState<{
    taskKey: string;
    field: 'epic' | 'assignee' | 'customer' | 'projectTask';
  } | null>(null);

  // Custom fallback inputs for adding a brand-new item to labels = fcrm_umb_epic
  const [newProjectTaskKey, setNewProjectTaskKey] = useState('');
  const [newProjectTaskSummary, setNewProjectTaskSummary] = useState('');

  const [newInProjectKey, setNewInProjectKey] = useState('');
  const [newInProjectSummary, setNewInProjectSummary] = useState('');
  const [newInProjectComponent, setNewInProjectComponent] = useState('Core-Scoring');
  const [newInProjectSprint, setNewInProjectSprint] = useState('FCRM Sprint 43 (11.11 – 25.11)');

  const [isZipping, setIsZipping] = useState(false);

  // New Task form state
  const [newTaskForm, setNewTaskForm] = useState({
    key: 'FCRM-4910',
    summary: '',
    epicKey: 'FCRM-4100',
    epicName: 'Единый кредитный конвейер B2B',
    component: 'Core-Scoring',
    assigneeName: 'Алексей Смирнов',
    assigneeRole: 'Senior Go Developer',
    authorName: 'Мария Соколова',
    customerName: 'Дмитрий Волков',
    customerDept: 'Дирекция кредитования МСБ',
    sprint: 'FCRM Sprint 43 (11.11 – 25.11)',
    status: 'todo' as IssueStatus,
    priority: 'Высокий' as FcrmTask['priority'],
    selectedUmbKey: 'PROJ-1210',
    inProjectKey: 'FCRM-4911',
    inProjectSummary: 'REST-эндпоинт расчёта скорингового балла',
    inProjectComponent: 'Core-Scoring',
    inProjectSprint: 'FCRM Sprint 43 (11.11 – 25.11)',
  });

  // Unique values for filters & inline selectors — strictly FCRM project only
  const uniqueSprints = useMemo(
    () =>
      Array.from(
        new Set([
          ...tasks
            .filter((t) => t.key.startsWith(`${config.projectKey}-`))
            .map((t) => t.sprint),
          'FCRM Sprint 44 (25.11 – 09.12)',
        ])
      ),
    [tasks, config.projectKey]
  );

  const getSprintStatusLabel = useCallback(
    (sprintName: string): 'Прошедший' | 'Активный' | 'Будущий' | null => {
      if (!sprintName) return null;
      const low = sprintName.toLowerCase();
      if (low.includes('бэклог') || low.includes('backlog') || low === 'не в спринте') {
        return null;
      }
      if (low.includes('42') || low.includes('41') || low.includes('прошедш') || low.includes('closed')) {
        return 'Прошедший';
      }
      if (low.includes('44') || low.includes('45') || low.includes('будущ') || low.includes('future')) {
        return 'Будущий';
      }
      return 'Активный';
    },
    []
  );

  // Везде где можно менять спринт — отображаем ТОЛЬКО Активные и Будущие спринты (+ Бэклог)
  const editableSprints = useMemo(
    () => uniqueSprints.filter((sp) => getSprintStatusLabel(sp) !== 'Прошедший'),
    [uniqueSprints, getSprintStatusLabel]
  );

  const formatSprintWithStatus = useCallback(
    (sprintName: string, stripPrefix = false): string => {
      if (!sprintName) return 'Не в спринте';
      const base = stripPrefix ? sprintName.replace('FCRM ', '') : sprintName;
      const st = getSprintStatusLabel(sprintName);
      if (!st) return base;
      if (base.includes(`(${st})`)) return base;
      return `${base} (${st})`;
    },
    [getSprintStatusLabel]
  );
  const allComponents = useMemo(() => {
    const fromFcrmTasks = tasks
      .filter((t) => t.key.startsWith(`${config.projectKey}-`))
      .map((t) => t.component);
    return Array.from(new Set([...DEFAULT_COMPONENT_OPTIONS, ...fromFcrmTasks]));
  }, [tasks, config.projectKey]);

  const uniqueEpics = useMemo(() => {
    const map = new Map<string, { epicKey: string; epicName: string }>();
    tasks.forEach((t) => {
      map.set(t.epicKey, { epicKey: t.epicKey, epicName: t.epicName });
    });
    return Array.from(map.values());
  }, [tasks]);

  const uniqueAssignees = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.assignee.name))),
    [tasks]
  );
  const uniqueCustomers = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.customer.name))),
    [tasks]
  );

  // Filtered JQL `labels = fcrm_umb_epic` options for quick selection (без отменённых Canceled)
  const filteredUmbEpicOptions = useMemo(() => {
    const q = umbSearchQuery.trim().toLowerCase();
    return umbEpicCatalog
      .filter((item) => !isCanceledStatusValue(item.status))
      .filter(
        (item) =>
          !q ||
          item.key.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
      );
  }, [umbEpicCatalog, umbSearchQuery]);

  // Update any field of a task
  const handleUpdateTask = useCallback(
    (taskKey: string, updater: (task: FcrmTask) => FcrmTask) => {
      setTasks((prev) => prev.map((t) => (t.key === taskKey ? updater(t) : t)));
    },
    []
  );

  // Toggle a task from JQL `labels = fcrm_umb_epic` in the current task's "Задача проекта" block
  const handleToggleUmbProjectTask = useCallback(
    (taskKey: string, umbItem: LinkedIssueItem) => {
      handleUpdateTask(taskKey, (t) => {
        const exists = t.projectTaskLinks.some((l) => l.key === umbItem.key);
        if (exists) {
          return {
            ...t,
            projectTaskLinks: t.projectTaskLinks.filter((l) => l.key !== umbItem.key),
          };
        }
        return {
          ...t,
          projectTaskLinks: [
            ...t.projectTaskLinks,
            {
              id: `pt-${Date.now()}-${umbItem.key}`,
              key: umbItem.key,
              summary: umbItem.summary,
              status: umbItem.status,
            },
          ],
        };
      });
    },
    [handleUpdateTask]
  );

  // Update a specific linked issue inside "В проекте" (e.g., its sprint, component, status, or summary)
  const handleUpdateInProjectLink = useCallback(
    (taskKey: string, linkId: string, patch: Partial<LinkedIssueItem>) => {
      handleUpdateTask(taskKey, (t) => ({
        ...t,
        inProjectLinks: t.inProjectLinks.map((l) =>
          l.id === linkId ? { ...l, ...patch } : l
        ),
      }));
    },
    [handleUpdateTask]
  );

  const sortTasksArray = useCallback(
    (arr: FcrmTask[]): FcrmTask[] => {
      if (sortBy === 'default') return arr;
      return [...arr].sort((a, b) => {
        if (sortBy === 'priority_desc') {
          const diff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          if (diff !== 0) return diff;
        } else if (sortBy === 'priority_asc') {
          const diff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
          if (diff !== 0) return diff;
        } else if (sortBy === 'created_desc') {
          const diff = parseCreatedAtTimestamp(b.createdAt) - parseCreatedAtTimestamp(a.createdAt);
          if (diff !== 0) return diff;
        } else if (sortBy === 'created_asc') {
          const diff = parseCreatedAtTimestamp(a.createdAt) - parseCreatedAtTimestamp(b.createdAt);
          if (diff !== 0) return diff;
        }
        return a.key.localeCompare(b.key, 'ru', { numeric: true });
      });
    },
    [sortBy]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (isCanceledStatusValue(t.status)) return false;
      if (hideEpicTasks && isEpicIssueTypeValue(t.issueType)) return false;
      if (selectedSprintFilter !== 'all' && t.sprint !== selectedSprintFilter) return false;
      if (selectedComponent !== 'all' && t.component !== selectedComponent) return false;
      if (selectedEpic !== 'all' && `${t.epicKey} · ${t.epicName}` !== selectedEpic) return false;
      if (selectedCustomer !== 'all' && t.customer.name !== selectedCustomer) return false;
      if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;

      if (!q) return true;
      const inLinks = [
        ...t.projectTaskLinks.map((l) => `${l.key} ${l.summary}`),
        ...t.inProjectLinks.map(
          (l) => `${l.key} ${l.summary} ${l.component || ''} ${l.sprint || ''}`
        ),
      ]
        .join(' ')
        .toLowerCase();

      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        (t.issueType || 'Задача').toLowerCase().includes(q) ||
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
  }, [
    tasks,
    searchQuery,
    selectedSprintFilter,
    selectedComponent,
    selectedEpic,
    selectedCustomer,
    selectedStatusFilter,
    hideEpicTasks,
  ]);

  // Group filtered tasks by Sprint -> Component (2-level Jira Structure hierarchy)
  const sprintGroups = useMemo(() => {
    const map = new Map<string, FcrmTask[]>();
    filteredTasks.forEach((task) => {
      const list = map.get(task.sprint) || [];
      list.push(task);
      map.set(task.sprint, list);
    });
    return Array.from(map.entries()).map(([sprintName, rawItems]) => {
      const items = sortTasksArray(rawItems);
      const compMap = new Map<string, FcrmTask[]>();
      items.forEach((t) => {
        const compName = (t.component || '').trim() || 'Без компонента';
        const compList = compMap.get(compName) || [];
        compList.push(t);
        compMap.set(compName, compList);
      });
      const componentGroups = Array.from(compMap.entries())
        .sort((a, b) => {
          if (a[0] === 'Без компонента') return 1;
          if (b[0] === 'Без компонента') return -1;
          return a[0].localeCompare(b[0], 'ru');
        })
        .map(([componentName, compItems]) => ({
          componentName,
          items: sortTasksArray(compItems),
        }));
      return {
        sprintName,
        items,
        componentGroups,
      };
    });
  }, [filteredTasks, sortTasksArray]);

  const [collapsedComponents, setCollapsedComponents] = useState<Record<string, boolean>>({});
  const [loadingComponents, setLoadingComponents] = useState<Record<string, boolean>>({});

  const toggleComponentCollapse = (compKey: string) => {
    const wasCollapsed = Boolean(collapsedComponents[compKey]);
    if (wasCollapsed) {
      setLoadingComponents((prev) => ({ ...prev, [compKey]: true }));
      setCollapsedComponents((prev) => ({ ...prev, [compKey]: false }));
      setTimeout(() => {
        setLoadingComponents((prev) => ({ ...prev, [compKey]: false }));
      }, 220);
    } else {
      setCollapsedComponents((prev) => ({
        ...prev,
        [compKey]: true,
      }));
    }
  };

  const selectedTask = useMemo(
    () => tasks.find((t) => t.key === selectedTaskKey) || null,
    [tasks, selectedTaskKey]
  );

  // Accordion toggle with subtle Loader/500 transition when opening (per Spec 2)
  const toggleSprintCollapse = (sprintName: string) => {
    const wasCollapsed = Boolean(collapsedSprints[sprintName]);
    if (wasCollapsed) {
      setLoadingSprints((prev) => ({ ...prev, [sprintName]: true }));
      setCollapsedSprints((prev) => ({ ...prev, [sprintName]: false }));
      setTimeout(() => {
        setLoadingSprints((prev) => ({ ...prev, [sprintName]: false }));
      }, 150);
    } else {
      setCollapsedSprints((prev) => ({ ...prev, [sprintName]: true }));
    }
  };

  const toggleAllSprints = () => {
    const anyCollapsed = sprintGroups.some((g) => collapsedSprints[g.sprintName]);
    if (anyCollapsed) {
      setCollapsedSprints({});
    } else {
      const next: Record<string, boolean> = {};
      sprintGroups.forEach((g) => {
        next[g.sprintName] = true;
      });
      setCollapsedSprints(next);
    }
  };

  const toggleTaskRowExpand = (e: React.MouseEvent, taskKey: string) => {
    e.stopPropagation();
    setExpandedTaskRows((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }));
  };

  // Download packaged Chrome Extension ZIP + show quick launch modal
  const handleDownloadExtensionZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      zip.file('manifest.json', generateManifestJson(config));
      zip.file('content.js', generateContentScriptJs(config, tasks, umbEpicCatalog));
      zip.file('styles.css', generateStylesCss(config));
      zip.file('popup.html', generatePopupHtml(config));
      zip.file('popup.js', generatePopupJs(config));

      const readme = `КАК ЗАПУСТИТЬ РАСШИРЕНИЕ В GOOGLE CHROME:

1. Распакуйте этот скачанный архив (ozon-bank-jira-structure-fcrm.zip) в любую отдельную папку на компьютере.
2. Откройте браузер Google Chrome (или Яндекс.Браузер / Edge) и введите в адресной строке:
   chrome://extensions/
3. В правом верхнем углу включите переключатель «Режим разработчика» (Developer mode).
4. В левом верхнем углу нажмите кнопку «Загрузить распакованное расширение» (Load unpacked) и выберите папку, куда вы распаковали файлы.
5. Откройте вашу доску Jira:
   https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349&projectKey=FCRM#
   Расширение автоматически включит компактный реестр Ozon Bank · FCRM Structure (также в шапке Jira появится кнопка «Ozon Structure FCRM» для переключения между стандартной доской и реестром Structure).`;

      zip.file('README-ЗАПУСК.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ozon-bank-jira-structure-${config.projectKey.toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsInstallGuideOpen(true);
    } finally {
      setTimeout(() => setIsZipping(false), 300);
    }
  };

  const handleMoveTaskStatus = (taskKey: string, newStatus: IssueStatus) => {
    handleUpdateTask(taskKey, (t) => ({ ...t, status: newStatus }));
  };

  const handleAddCustomProjectTaskLink = (taskKey: string) => {
    if (!newProjectTaskKey.trim() || !newProjectTaskSummary.trim()) return;
    const newItem: LinkedIssueItem = {
      id: `pt-${Date.now()}`,
      key: newProjectTaskKey.trim().toUpperCase(),
      summary: newProjectTaskSummary.trim(),
      status: 'В работе',
    };
    setUmbEpicCatalog((prev) =>
      prev.some((x) => x.key === newItem.key) ? prev : [newItem, ...prev]
    );
    handleUpdateTask(taskKey, (t) => ({
      ...t,
      projectTaskLinks: [...t.projectTaskLinks, newItem],
    }));
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
      component: newInProjectComponent.trim() || 'Core-Scoring',
      sprint: newInProjectSprint.trim() || 'FCRM Sprint 43 (11.11 – 25.11)',
    };
    handleUpdateTask(taskKey, (t) => ({
      ...t,
      inProjectLinks: [...t.inProjectLinks, newItem],
    }));
    setNewInProjectKey('');
    setNewInProjectSummary('');
  };

  const handleRemoveLink = (
    taskKey: string,
    block: 'projectTaskLinks' | 'inProjectLinks',
    linkId: string
  ) => {
    handleUpdateTask(taskKey, (t) => ({
      ...t,
      [block]: t[block].filter((l) => l.id !== linkId),
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.summary.trim()) return;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createdAt = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    const matchedUmb = umbEpicCatalog.find(
      (u) => u.key === newTaskForm.selectedUmbKey
    );

    const created: FcrmTask = {
      key:
        newTaskForm.key.trim().toUpperCase() ||
        `FCRM-${Math.floor(4910 + Math.random() * 90)}`,
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
      projectTaskLinks: matchedUmb
        ? [
            {
              id: `pt-${Date.now()}`,
              key: matchedUmb.key,
              summary: matchedUmb.summary,
              status: matchedUmb.status,
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
              component: newTaskForm.inProjectComponent.trim() || newTaskForm.component.trim(),
              sprint: newTaskForm.inProjectSprint.trim() || newTaskForm.sprint.trim(),
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
    setSelectedSprintFilter('all');
    setSelectedComponent('all');
    setSelectedEpic('all');
    setSelectedCustomer('all');
    setSelectedStatusFilter('all');
    setHideEpicTasks(false);
    setSortBy('default');
  };

  // Total table width for smooth horizontal scrolling when columns are resized
  const totalTableWidth = useMemo(() => {
    let sum = columnWidths.task + columnWidths.status;
    if (config.showEpic) sum += columnWidths.epic;
    if (config.showComponent) sum += columnWidths.component;
    if (config.showAssignee) sum += columnWidths.assignee;
    if (config.showAuthor) sum += columnWidths.author;
    if (config.showCustomer) sum += columnWidths.customer;
    if (config.showCreatedAt) sum += columnWidths.createdAt;
    if (config.showSprint) sum += columnWidths.sprint;
    if (config.showProjectTaskLinks) sum += columnWidths.projectTaskLinks;
    if (config.showInProjectLinks) sum += columnWidths.inProjectLinks;
    return sum;
  }, [columnWidths, config]);

  // Helper to render a resizable <th> header cell
  const renderResizableTh = (
    colId: ColumnId,
    label: React.ReactNode,
    title?: string,
    extraClassName = ''
  ) => (
    <th
      style={{
        width: `${columnWidths[colId]}px`,
        minWidth: `${columnWidths[colId]}px`,
        maxWidth: `${columnWidths[colId]}px`,
      }}
      title={title}
      className={`relative group py-1.5 px-2 border-r border-[#E2E8F0] whitespace-nowrap overflow-hidden text-ellipsis ${extraClassName}`}
    >
      <div className="truncate pr-2">{label}</div>
      {/* Drag Handle on Right Edge of Column Header */}
      <div
        onMouseDown={(e) => startColumnResize(e, colId)}
        onClick={(e) => e.stopPropagation()}
        title="Потяните влево или вправо для изменения ширины столбца"
        className={`ozon-inner-control absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize transition-colors z-30 ${
          activeResizingCol === colId
            ? 'bg-[#005BFF]'
            : 'bg-transparent group-hover:bg-[#CBD5E1] hover:!bg-[#005BFF]'
        }`}
      />
    </th>
  );

  return (
    <div
      className={`h-screen flex flex-col bg-[#F5F7FA] text-[#071026] overflow-hidden ${
        isDraggingSidebar || activeResizingCol ? 'cursor-col-resize select-none' : ''
      }`}
    >
      {/* =====================================================================
          ULTRA-COMPACT TOP BAR CONTRACT: 1 row, 3 zones separated by gap-8
          Only "Все спринты" in the navigation zone
         ===================================================================== */}
      <header className="shrink-0 flex items-center justify-between gap-8 px-3 py-1.5 bg-white border-b border-[#E2E8F0]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#structure"
          onClick={(e) => {
            e.preventDefault();
            resetFilters();
          }}
          className="ozon-focusable rounded text-sm font-bold tracking-tight text-[#071026] whitespace-nowrap shrink-0 font-display"
        >
          Ozon Bank · FCRM Structure
        </a>

        {/* Zone 2: "Все спринты" + легенда индикаторов (скрепка и красный человечек) */}
        <nav className="flex items-center gap-4 text-xs font-semibold text-[#005BFF]">
          <a
            href="#all-sprints"
            onClick={(e) => {
              e.preventDefault();
              setSelectedSprintFilter('all');
              setCollapsedSprints({});
            }}
            className="ozon-focusable rounded hover:underline whitespace-nowrap shrink-0"
          >
            Все спринты ({tasks.length})
          </a>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B]"
            title="Красная скрепка отмечает задачи без привязанной «Задачи проекта»"
          >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#FEE2E2] text-[#DC2626]">
              <Paperclip className="w-2.5 h-2.5" />
            </span>
            <span>— нет «Задачи проекта»</span>
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B]"
            title="Красный человечек отмечает задачи без назначенного Исполнителя"
          >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#FEE2E2] text-[#DC2626]">
              <UserX className="w-2.5 h-2.5" />
            </span>
            <span>— нет Исполнителя</span>
          </span>
        </nav>

        {/* Zone 3: 1 primary action (Uses Spec 3 Button Tinted + Loading spinner replacement) */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handleDownloadExtensionZip}
            disabled={isZipping}
            className="ozon-btn-tinted ozon-focusable min-w-[172px] h-7 inline-flex items-center justify-center gap-1.5 px-3 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isZipping ? (
              <span className="ozon-loader-500" aria-label="Загрузка" />
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Скачать расширение .ZIP</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          COMPACT JIRA STRUCTURE TOOLBAR (Filters, Search, Group Controls)
         ===================================================================== */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[260px]">
          {/* Expand / Collapse all Sprints button (Spec 3 Surface Button) */}
          <button
            onClick={toggleAllSprints}
            className="ozon-btn-surface ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            title="Свернуть или развернуть все группы спринтов"
          >
            <ChevronsUpDown className="w-3 h-3 text-[#005BFF]" />
            <span>Спринты</span>
          </button>

          {/* Compact Search */}
          <div className="relative w-60 sm:w-72">
            <Search className="w-3 h-3 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ключу, задаче, заказчику, связям..."
              className="ozon-focusable w-full pl-7 pr-6 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] placeholder:text-[#64748B] focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="ozon-focusable rounded absolute right-1.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071026] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Compact Select Filters */}
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            aria-label="Фильтр по компоненту"
            className="ozon-focusable px-2 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] cursor-pointer"
          >
            <option value="all">Компонент: Все</option>
            {allComponents.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedEpic}
            onChange={(e) => setSelectedEpic(e.target.value)}
            aria-label="Фильтр по эпику"
            className="ozon-focusable px-2 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] cursor-pointer max-w-[180px] truncate"
          >
            <option value="all">Эпик: Все</option>
            {uniqueEpics.map((ep) => (
              <option
                key={ep.epicKey}
                value={`${ep.epicKey} · ${ep.epicName}`}
              >
                {ep.epicKey} · {ep.epicName}
              </option>
            ))}
          </select>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            aria-label="Фильтр по Заказчик/Owner"
            className="ozon-focusable px-2 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] cursor-pointer"
          >
            <option value="all">Заказчик/Owner: Все</option>
            {uniqueCustomers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            aria-label="Фильтр по статусу"
            className="ozon-focusable px-2 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] cursor-pointer"
          >
            <option value="all">Статус: Все</option>
            {STATUS_COLUMNS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* Фильтр «Скрыть задачи с типом Эпик» */}
          <button
            type="button"
            onClick={() => setHideEpicTasks((v) => !v)}
            className={`ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer rounded-lg transition-colors ${
              hideEpicTasks ? 'ozon-btn-tinted' : 'ozon-btn-surface text-[#334155]'
            }`}
            title="Скрыть или показать задачи с типом Эпик"
          >
            <span>{hideEpicTasks ? '✓ Скрыты задачи с типом Эпик' : 'Скрыть задачи с типом Эпик'}</span>
          </button>

          {/* Сортировка по Приоритету и Дате создания */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Сортировка списка задач"
            className="ozon-focusable px-2 py-1 text-[11.5px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026] cursor-pointer"
          >
            <option value="default">Сортировка: По умолчанию</option>
            <option value="priority_desc">Сортировка: Приоритет (сначала высокий)</option>
            <option value="priority_asc">Сортировка: Приоритет (сначала низкий)</option>
            <option value="created_desc">Сортировка: Дата создания (сначала новые)</option>
            <option value="created_asc">Сортировка: Дата создания (сначала старые)</option>
          </select>

          {/* Negative Action Button per Spec 3 */}
          {(searchQuery ||
            selectedSprintFilter !== 'all' ||
            selectedComponent !== 'all' ||
            selectedEpic !== 'all' ||
            selectedCustomer !== 'all' ||
            selectedStatusFilter !== 'all' ||
            hideEpicTasks ||
            sortBy !== 'default') && (
            <button
              onClick={resetFilters}
              className="ozon-btn-negative ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsInstallGuideOpen(true)}
            className="ozon-btn-surface ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            title="Пошаговая инструкция установки и запуска расширения в Chrome"
          >
            <HelpCircle className="w-3 h-3 text-[#005BFF]" />
            <span>Как запустить в Chrome</span>
          </button>

          <button
            onClick={() => setIsFieldConfigOpen((v) => !v)}
            className="ozon-btn-surface ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Колонки</span>
          </button>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="ozon-btn-tinted ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Задача</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          COLLAPSIBLE COLUMN CONFIG BAR
         ===================================================================== */}
      {isFieldConfigOpen && (
        <div className="shrink-0 bg-[#F8FAFC] border-b border-[#E2E8F0] px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-[#475569] text-[11px] mr-1">
              Видимость колонок:
            </span>
            {(
              [
                { key: 'showEpic', label: 'Эпик' },
                { key: 'showComponent', label: 'Компонент' },
                { key: 'showAssignee', label: 'Исполнитель' },
                { key: 'showAuthor', label: 'Автор' },
                { key: 'showCustomer', label: 'Заказчик/Owner' },
                { key: 'showCreatedAt', label: 'Дата создания' },
                { key: 'showSprint', label: 'Спринт' },
                { key: 'showProjectTaskLinks', label: 'Задача проекта' },
                { key: 'showInProjectLinks', label: 'В проекте' },
              ] as { key: keyof ExtensionConfig; label: string }[]
            ).map((col) => {
              const active = Boolean(config[col.key]);
              return (
                <button
                  key={col.key}
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className={`ozon-focusable px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    active ? 'ozon-btn-tinted' : 'ozon-btn-surface text-[#64748B]'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#64748B]">
              Потяните за правую границу любого заголовка столбца в таблице для изменения ширины.
            </span>
            <button
              onClick={() => setColumnWidths(INITIAL_COLUMN_WIDTHS)}
              className="ozon-btn-surface ozon-focusable px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer"
            >
              Сбросить ширину столбцов
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN SPLIT WORKSPACE:
          LEFT: High-Density Jira Structure Grid with Resizable Columns
          CENTER: Interactive Drag Resizer Handle
          RIGHT: Resizable Task Details Panel with Editable Fields & Quick Picker
         ===================================================================== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT PANE: JIRA STRUCTURE COMPACT TABLE */}
        <div className="flex-1 overflow-auto bg-white min-h-0">
          <table
            style={{
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
              maxWidth: `${totalTableWidth}px`,
            }}
            className="table-fixed text-left border-collapse select-none"
          >
            <thead className="sticky top-0 z-20 bg-[#F1F5F9] border-b border-[#CBD5E1] text-[11px] font-bold text-[#334155]">
              <tr>
                {renderResizableTh(
                  'task',
                  'Задача (Спринт → Компонент → Задача)',
                  'Потяните правую границу заголовка для изменения ширины',
                  'pl-3'
                )}
                {renderResizableTh('status', 'Статус ▾', 'Статус задачи')}
                {config.showEpic &&
                  renderResizableTh(
                    'epic',
                    'Эпик ✎',
                    'Двойной клик по ячейке для редактирования эпика'
                  )}
                {config.showComponent &&
                  renderResizableTh(
                    'component',
                    'Компонент ▾',
                    'Кликните на компонент в строке для быстрой смены прямо в таблице',
                    'text-[#005BFF]'
                  )}
                {config.showAssignee &&
                  renderResizableTh(
                    'assignee',
                    'Исполнитель ✎',
                    'Двойной клик по ячейке для редактирования исполнителя'
                  )}
                {config.showAuthor &&
                  renderResizableTh('author', 'Автор', 'Автор задачи')}
                {config.showCustomer &&
                  renderResizableTh(
                    'customer',
                    'Заказчик/Owner ✎',
                    'Двойной клик по ячейке для редактирования поля Заказчик/Owner'
                  )}
                {config.showCreatedAt &&
                  renderResizableTh('createdAt', 'Создана', 'Дата создания задачи')}
                {config.showSprint &&
                  renderResizableTh(
                    'sprint',
                    'Спринт ▾',
                    'Кликните для перевода задачи в другой спринт'
                  )}
                {config.showProjectTaskLinks &&
                  renderResizableTh(
                    'projectTaskLinks',
                    'Задача проекта (fcrm_umb_epic) ✎',
                    'Двойной клик для быстрого выбора из фильтра labels = fcrm_umb_epic'
                  )}
                {config.showInProjectLinks &&
                  renderResizableTh(
                    'inProjectLinks',
                    'В проекте (Статус · Комп. · Спринт)',
                    'Связанные задачи блока «В проекте» со статусом, компонентом и спринтом'
                  )}
              </tr>
            </thead>

            <tbody className="text-[12px] divide-y divide-[#E2E8F0]">
              {sprintGroups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-[#64748B]">
                    Задачи по заданным критериям не найдены.{' '}
                    <button
                      onClick={resetFilters}
                      className="ozon-btn-tinted ozon-focusable px-2.5 py-1 ml-2 font-semibold cursor-pointer"
                    >
                      Сбросить фильтры
                    </button>
                  </td>
                </tr>
              ) : (
                sprintGroups.map((group) => {
                  const isCollapsed = Boolean(collapsedSprints[group.sprintName]);
                  const isLoading = Boolean(loadingSprints[group.sprintName]);
                  const doneCount = group.items.filter((i) => i.status === 'done').length;

                  return (
                    <React.Fragment key={group.sprintName}>
                      {/* =====================================================
                          SPRINT GROUP ACCORDION ROW (Spec 2: Accordion Default/Hover/Active/Focus/Load)
                         ===================================================== */}
                      <tr
                        tabIndex={0}
                        onClick={() => toggleSprintCollapse(group.sprintName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSprintCollapse(group.sprintName);
                          }
                        }}
                        className="ozon-accordion-header ozon-focusable bg-[#F8FAFC] hover:bg-[#F2F4F8] cursor-pointer font-semibold text-[#071026]"
                      >
                        <td colSpan={11} className="py-1.5 px-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tracking-tight text-[#071026]">
                                {group.sprintName}
                              </span>
                              {(() => {
                                const spStatus = getSprintStatusLabel(group.sprintName);
                                if (!spStatus) return null;
                                const badgeClass =
                                  spStatus === 'Активный'
                                    ? 'bg-[#DCFCE7] text-[#15803D]'
                                    : spStatus === 'Будущий'
                                    ? 'bg-[#E5F0FF] text-[#005BFF]'
                                    : 'bg-[#F1F5F9] text-[#475569]';
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${badgeClass}`}
                                  >
                                    {spStatus}
                                  </span>
                                );
                              })()}
                              <span className="text-[#CBD5E1]">·</span>
                              <span className="font-mono text-[11px] font-semibold text-[#005BFF] tabular-nums">
                                {group.items.length} задач
                              </span>
                              <span className="text-[#CBD5E1]">·</span>
                              <span className="text-[11px] font-normal text-[#64748B] tabular-nums">
                                Готово: {doneCount}/{group.items.length}
                              </span>
                            </div>

                            {/* Right Chevron per Accordion Spec 2 */}
                            <div className="flex items-center gap-2">
                              {isLoading && (
                                <span
                                  className="ozon-loader-500"
                                  title="Загрузка спринта (Loader/500)"
                                />
                              )}
                              {isCollapsed ? (
                                <ChevronDown className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                              ) : (
                                <ChevronUp className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* =====================================================
                          2ND LEVEL: COMPONENT SUB-GROUPS & COMPACT TASK ROWS
                         ===================================================== */}
                      {!isCollapsed &&
                        !isLoading &&
                        group.componentGroups.map((compGroup) => {
                          const compKey = `${group.sprintName}::${compGroup.componentName}`;
                          const isCompCollapsed = Boolean(collapsedComponents[compKey]);
                          const isCompLoading = Boolean(loadingComponents[compKey]);

                          return (
                            <React.Fragment key={compKey}>
                              <tr
                                onClick={() => toggleComponentCollapse(compKey)}
                                className="bg-[#FAFBFD] hover:bg-[#F1F5F9] cursor-pointer text-[11px] font-semibold text-[#334155] border-b border-[#E2E8F0]"
                              >
                                <td colSpan={11} className="py-1 pl-7 pr-3 border-l-[3px] border-l-[#93C5FD]">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {isCompLoading ? (
                                        <span className="ozon-loader-500" title="Перезапрос задач компонента из Jira..." />
                                      ) : isCompCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5 text-[#005BFF] shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-[#005BFF] shrink-0" />
                                      )}
                                      <span className="text-[#64748B] font-medium">Компонент:</span>
                                      <span className="font-bold text-[#071026]">
                                        {compGroup.componentName}
                                      </span>
                                      <span className="font-mono text-[10.5px] font-semibold text-[#005BFF] bg-[#EBF3FF] px-1.5 py-0.2 rounded tabular-nums">
                                        {compGroup.items.length} задач
                                      </span>
                                    </div>
                                    <span className="text-[10.5px] text-[#94A3B8]">
                                      {isCompLoading
                                        ? 'Перезапрос задач из Jira...'
                                        : isCompCollapsed
                                        ? `Показать (${compGroup.items.length})`
                                        : 'Свернуть'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {!isCompCollapsed &&
                                compGroup.items.map((task) => {
                                  const isSelected = selectedTaskKey === task.key;
                                  const isRowExpanded = Boolean(expandedTaskRows[task.key]);
                                  const totalLinks =
                                    task.projectTaskLinks.length + task.inProjectLinks.length;
                                  const hasNoProjectTask = task.projectTaskLinks.length === 0;
                                  const assigneeClean = (task.assignee?.name || '').trim().toLowerCase();
                                  const hasNoAssignee =
                                    !assigneeClean ||
                                    assigneeClean === 'не назначен' ||
                                    assigneeClean === 'не указан' ||
                                    assigneeClean === '—' ||
                                    assigneeClean === '-';

                                  return (
                                    <React.Fragment key={task.key}>
                              <tr
                                tabIndex={0}
                                onClick={(e) => {
                                  if (totalLinks > 0) {
                                    toggleTaskRowExpand(e, task.key);
                                  } else {
                                    setSelectedTaskKey(task.key);
                                    setIsEditingDescription(false);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setSelectedTaskKey(task.key);
                                    setIsEditingDescription(false);
                                  }
                                }}
                                className={`ozon-row-item ozon-focusable h-7 cursor-pointer ${
                                  isSelected ? 'ozon-row-selected' : ''
                                }`}
                              >
                                {/* 1. Key + Summary + Structure Tree Expand Chevron + ◨ Детали button (Уровень 3 лесенки: pl-11) */}
                                <td className="py-0.5 pl-11 pr-2 border-l-[3px] border-l-[#E2E8F0] border-r border-r-[#EEF2F6] overflow-hidden">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => toggleTaskRowExpand(e, task.key)}
                                      className={`ozon-inner-control ozon-focusable w-4 h-4 flex items-center justify-center rounded hover:bg-[#005BFF]/12 text-[#64748B] hover:text-[#005BFF] shrink-0 cursor-pointer ${
                                        totalLinks === 0 ? 'opacity-25 pointer-events-none' : ''
                                      }`}
                                      title="Развернуть связанные задачи в дереве Structure"
                                    >
                                      {isRowExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-[#005BFF]" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                    {renderIssueTypeBadge(task.issueType || 'Задача')}
                                    <span className="font-mono text-[11px] font-bold text-[#005BFF] shrink-0 tabular-nums">
                                      {task.key}
                                    </span>
                                    {hasNoProjectTask && (
                                      <span
                                        className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#FEE2E2] text-[#DC2626] shrink-0 cursor-help"
                                        title="Внимание: у задачи нет связи «Задача проекта» (fcrm_umb_epic)"
                                      >
                                        <Paperclip className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                    {hasNoAssignee && (
                                      <span
                                        className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#FEE2E2] text-[#DC2626] shrink-0 cursor-help"
                                        title="Внимание: у задачи не назначен Исполнитель"
                                      >
                                        <UserX className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                    <span
                                      className="font-medium text-[#071026] truncate text-[11.5px] flex-1"
                                      title={task.summary}
                                    >
                                      {task.summary}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTaskKey((prev) =>
                                          prev === task.key ? null : task.key
                                        );
                                        setIsEditingDescription(false);
                                      }}
                                      title="Открыть панель деталей задачи справа"
                                      className={`ozon-inner-control shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#005BFF] text-white border-[#005BFF]'
                                          : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#EBF3FF] hover:text-[#005BFF] hover:border-[#93C5FD]'
                                      }`}
                                    >
                                      ◨ Детали
                                    </button>
                                  </div>
                                </td>

                                {/* Status (Direct 1-click inline selector in table) */}
                                <td
                                  onClick={(e) => e.stopPropagation()}
                                  className="py-0.5 px-1.5 border-r border-[#EEF2F6] whitespace-nowrap overflow-hidden"
                                >
                                  <select
                                    value={task.status}
                                    onChange={(e) =>
                                      handleMoveTaskStatus(
                                        task.key,
                                        e.target.value as IssueStatus
                                      )
                                    }
                                    aria-label={`Статус задачи ${task.key}`}
                                    className={`ozon-inner-control ozon-inline-select w-full px-1 py-0.5 text-[11px] cursor-pointer truncate ${
                                      task.status === 'in_progress'
                                        ? 'text-[#005BFF] font-semibold'
                                        : task.status === 'review'
                                        ? 'text-[#D97706] font-semibold'
                                        : task.status === 'testing'
                                        ? 'text-[#7C3AED] font-semibold'
                                        : task.status === 'done'
                                        ? 'text-[#16A34A] font-semibold'
                                        : 'text-[#475569]'
                                    }`}
                                  >
                                    {STATUS_COLUMNS.map((st) => (
                                      <option key={st.id} value={st.id}>
                                        {st.title}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* 2. Эпик */}
                                {config.showEpic && (
                                  <td
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCell({ taskKey: task.key, field: 'epic' });
                                    }}
                                    className="py-0.5 px-2 border-r border-[#EEF2F6] truncate text-[11px]"
                                    title={`${task.epicKey} · ${task.epicName} (Двойной клик для изменения)`}
                                  >
                                    {editingCell?.taskKey === task.key &&
                                    editingCell.field === 'epic' ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        defaultValue={task.epicName}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          if (val) {
                                            handleUpdateTask(task.key, (t) => ({
                                              ...t,
                                              epicName: val,
                                            }));
                                          }
                                          setEditingCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          } else if (e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }}
                                        className="ozon-inner-control ozon-focusable w-full px-1 py-0 text-[11px] bg-white border border-[#005BFF] rounded"
                                      />
                                    ) : (
                                      <>
                                        <span className="font-mono font-semibold text-[#005BFF]">
                                          {task.epicKey}
                                        </span>{' '}
                                        <span className="text-[#334155]">{task.epicName}</span>
                                      </>
                                    )}
                                  </td>
                                )}

                                {/* 3. КОМПОНЕНТ — ПРЯМОЕ ИЗМЕНЕНИЕ В ТАБЛИЦЕ В 1 КЛИК */}
                                {config.showComponent && (
                                  <td
                                    onClick={(e) => e.stopPropagation()}
                                    className="py-0.5 px-1.5 border-r border-[#EEF2F6] overflow-hidden"
                                  >
                                    <select
                                      value={task.component}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleUpdateTask(task.key, (t) => ({
                                          ...t,
                                          component: val,
                                        }));
                                      }}
                                      aria-label={`Компонент задачи ${task.key}`}
                                      title="Изменить компонент задачи прямо в таблице"
                                      className="ozon-inner-control ozon-inline-select w-full px-1.5 py-0.5 text-[11px] font-semibold text-[#071026] cursor-pointer truncate"
                                    >
                                      {allComponents.map((comp) => (
                                        <option key={comp} value={comp}>
                                          {comp}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                )}

                                {/* 4. Исполнитель */}
                                {config.showAssignee && (
                                  <td
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCell({ taskKey: task.key, field: 'assignee' });
                                    }}
                                    className="py-0.5 px-2 border-r border-[#EEF2F6] truncate text-[11px] text-[#071026]"
                                    title={`${task.assignee.name} (Двойной клик для изменения)`}
                                  >
                                    {editingCell?.taskKey === task.key &&
                                    editingCell.field === 'assignee' ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        defaultValue={task.assignee.name}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          if (val) {
                                            handleUpdateTask(task.key, (t) => ({
                                              ...t,
                                              assignee: { ...t.assignee, name: val },
                                            }));
                                          }
                                          setEditingCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          } else if (e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }}
                                        className="ozon-inner-control ozon-focusable w-full px-1 py-0 text-[11px] bg-white border border-[#005BFF] rounded"
                                      />
                                    ) : (
                                      task.assignee.name
                                    )}
                                  </td>
                                )}

                                {/* 5. Автор */}
                                {config.showAuthor && (
                                  <td
                                    className="py-0.5 px-2 border-r border-[#EEF2F6] truncate text-[11px] text-[#475569]"
                                    title={task.author.name}
                                  >
                                    {task.author.name}
                                  </td>
                                )}

                                {/* 6. Заказчик */}
                                {config.showCustomer && (
                                  <td
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCell({ taskKey: task.key, field: 'customer' });
                                    }}
                                    className="py-0.5 px-2 border-r border-[#EEF2F6] truncate text-[11px]"
                                    title={`${task.customer.name} · ${task.customer.department} (Двойной клик для изменения)`}
                                  >
                                    {editingCell?.taskKey === task.key &&
                                    editingCell.field === 'customer' ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        defaultValue={task.customer.name}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          if (val) {
                                            handleUpdateTask(task.key, (t) => ({
                                              ...t,
                                              customer: { ...t.customer, name: val },
                                            }));
                                          }
                                          setEditingCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          } else if (e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }}
                                        className="ozon-inner-control ozon-focusable w-full px-1 py-0 text-[11px] bg-white border border-[#005BFF] rounded"
                                      />
                                    ) : (
                                      <>
                                        <span className="font-semibold text-[#004ED6]">
                                          {task.customer.name}
                                        </span>{' '}
                                        <span className="text-[#64748B] text-[10px]">
                                          · {task.customer.department}
                                        </span>
                                      </>
                                    )}
                                  </td>
                                )}

                                {/* 7. Дата создания */}
                                {config.showCreatedAt && (
                                  <td className="py-0.5 px-2 border-r border-[#EEF2F6] whitespace-nowrap truncate font-mono text-[10.5px] text-[#475569] tabular-nums">
                                    {task.createdAt}
                                  </td>
                                )}

                                {/* 8. Спринт (Direct 1-click inline selector in table — только Активные и Будущие спринты) */}
                                {config.showSprint && (
                                  <td
                                    onClick={(e) => e.stopPropagation()}
                                    className="py-0.5 px-1.5 border-r border-[#EEF2F6] overflow-hidden"
                                  >
                                    <select
                                      value={task.sprint}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleUpdateTask(task.key, (t) => ({
                                          ...t,
                                          sprint: val,
                                        }));
                                      }}
                                      aria-label={`Спринт задачи ${task.key}`}
                                      title="Изменить спринт задачи (доступны только Активные и Будущие спринты)"
                                      className="ozon-inner-control ozon-inline-select w-full px-1 py-0.5 text-[11px] text-[#475569] tabular-nums cursor-pointer truncate"
                                    >
                                      {!editableSprints.includes(task.sprint) && (
                                        <option value={task.sprint} disabled hidden>
                                          {formatSprintWithStatus(task.sprint, true)}
                                        </option>
                                      )}
                                      {editableSprints.map((sp) => (
                                        <option key={sp} value={sp}>
                                          {formatSprintWithStatus(sp, true)}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                )}

                                {/* 9. Блок связей «Задача проекта» (Quick-Select from JQL labels = fcrm_umb_epic) */}
                                {config.showProjectTaskLinks && (
                                  <td
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCell({
                                        taskKey: task.key,
                                        field: 'projectTask',
                                      });
                                    }}
                                    className="py-0.5 px-2 border-r border-[#EEF2F6] truncate text-[11px]"
                                    title={
                                      task.projectTaskLinks
                                        .map((l) => `${l.key}: ${l.summary} (${l.status})`)
                                        .join('\n') +
                                      '\n(Двойной клик для быстрого выбора из labels = fcrm_umb_epic)'
                                    }
                                  >
                                    {editingCell?.taskKey === task.key &&
                                    editingCell.field === 'projectTask' ? (
                                      <select
                                        autoFocus
                                        value=""
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const chosenKey = e.target.value;
                                          const found = umbEpicCatalog.find(
                                            (u) => u.key === chosenKey
                                          );
                                          if (found) {
                                            handleToggleUmbProjectTask(task.key, found);
                                          }
                                          setEditingCell(null);
                                        }}
                                        onBlur={() => setEditingCell(null)}
                                        className="ozon-inner-control ozon-focusable w-full px-1 py-0 text-[11px] bg-white border border-[#005BFF] rounded"
                                      >
                                        <option value="" disabled>
                                          + Выбрать из fcrm_umb_epic...
                                        </option>
                                        {umbEpicCatalog.map((u) => {
                                          const linked = task.projectTaskLinks.some(
                                            (l) => l.key === u.key
                                          );
                                          return (
                                            <option key={u.key} value={u.key}>
                                              {linked ? '✓ ' : ''}
                                              {u.key} · {u.summary}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    ) : task.projectTaskLinks.length === 0 ? (
                                      <span className="text-[#94A3B8] italic">
                                        + Выбрать (fcrm_umb_epic)
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1 truncate">
                                        <span className="font-mono font-semibold text-[#005BFF] shrink-0">
                                          {task.projectTaskLinks.map((l) => l.key).join(', ')}
                                        </span>
                                        <span className="text-[#64748B] truncate">
                                          {task.projectTaskLinks[0].summary}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                )}

                                {/* 10. Блок связей «В проекте» (с отображением компонента и спринта) */}
                                {config.showInProjectLinks && (
                                  <td
                                    className="py-0.5 px-2 truncate text-[11px]"
                                    title={task.inProjectLinks
                                      .map(
                                        (l) =>
                                          `${l.key}: ${l.summary} | Статус: ${l.status} | Компонент: ${
                                            l.component || '—'
                                          } | Спринт: ${l.sprint || '—'}`
                                      )
                                      .join('\n')}
                                  >
                                    {task.inProjectLinks.length === 0 ? (
                                      <span className="text-[#CBD5E1]">—</span>
                                    ) : (
                                      <div className="flex items-center gap-1 truncate">
                                        <span className="font-mono font-semibold text-[#005BFF] shrink-0 tabular-nums">
                                          {task.inProjectLinks.map((l) => l.key).join(', ')}
                                        </span>
                                        <span className="text-[#071026] font-medium shrink-0">
                                          {task.inProjectLinks[0].component}
                                        </span>
                                        <span className="text-[#CBD5E1]">·</span>
                                        <span className="text-[#64748B] truncate tabular-nums">
                                          {(task.inProjectLinks[0].sprint || '').replace(
                                            'FCRM ',
                                            ''
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>

                              {/* =================================================
                                  INLINE SUB-TREE ROWS FOR LINKED ISSUES
                                 ================================================= */}
                              {isRowExpanded && (
                                <>
                                  {task.projectTaskLinks
                                    .filter((link) => !isCanceledStatusValue(link.status))
                                    .map((link) => (
                                    <tr
                                      key={`${task.key}-pt-${link.id}`}
                                      onClick={() => {
                                        setSelectedTaskKey(task.key);
                                        setIsEditingDescription(false);
                                      }}
                                      className="ozon-row-item bg-[#FAFBFD] text-[11px] text-[#475569] cursor-pointer"
                                    >
                                      <td colSpan={11} className="py-1 pl-16 pr-3 border-l-[3px] border-l-[#CBD5E1]">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[#94A3B8] font-bold">↳</span>
                                          <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] shrink-0"
                                            title="Тип связи: Задача проекта (fcrm_umb_epic)"
                                          >
                                            <FolderGit2 className="w-2.5 h-2.5 text-[#64748B] shrink-0" />
                                            <span>{config.linkTypeProjectTask}</span>
                                          </span>
                                          {renderIssueTypeBadge(link.issueType || 'Эпик')}
                                          <span className="font-mono font-bold text-[#005BFF] shrink-0">
                                            {link.key}
                                          </span>
                                          <span className="text-[#071026] font-medium truncate">
                                            {link.summary}
                                          </span>
                                          <span className="text-[#CBD5E1]">·</span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold shrink-0 ${
                                              link.status === 'Готово'
                                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                                : link.status === 'В работе'
                                                ? 'bg-[#E5F0FF] text-[#005BFF]'
                                                : 'bg-[#F1F5F9] text-[#475569]'
                                            }`}
                                          >
                                            {link.status}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  {task.inProjectLinks
                                    .filter((link) => !isCanceledStatusValue(link.status))
                                    .map((link) => (
                                    <tr
                                      key={`${task.key}-ip-${link.id}`}
                                      onClick={() => {
                                        setSelectedTaskKey(task.key);
                                        setIsEditingDescription(false);
                                      }}
                                      className="ozon-row-item bg-[#F8FAFC] text-[11px] text-[#475569] cursor-pointer"
                                    >
                                      <td colSpan={11} className="py-1 pl-16 pr-3 border-l-[3px] border-l-[#CBD5E1]">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                          <span className="text-[#94A3B8] font-bold">↳</span>
                                          <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] shrink-0"
                                            title="Тип связи: В проекте (смежная задача реализации)"
                                          >
                                            <Link2 className="w-2.5 h-2.5 text-[#64748B] shrink-0" />
                                            <span>{config.linkTypeInProject}</span>
                                          </span>
                                          {renderIssueTypeBadge(link.issueType || 'Задача')}
                                          <span className="font-mono font-bold text-[#005BFF] shrink-0">
                                            {link.key}
                                          </span>
                                          <span className="text-[#071026] font-medium truncate max-w-sm">
                                            {link.summary}
                                          </span>
                                          <span className="text-[#CBD5E1]">·</span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold shrink-0 ${
                                              link.status === 'Готово'
                                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                                : link.status === 'В работе'
                                                ? 'bg-[#E5F0FF] text-[#005BFF]'
                                                : link.status === 'Ревью' ||
                                                  link.status === 'Тестирование'
                                                ? 'bg-[#FEF3C7] text-[#B45309]'
                                                : 'bg-[#F1F5F9] text-[#475569]'
                                            }`}
                                          >
                                            {link.status}
                                          </span>
                                          <span className="text-[#CBD5E1]">·</span>
                                          {/* Direct inline Component selector for 'В проекте' sub-row */}
                                          <span
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 shrink-0"
                                          >
                                            <span className="text-[#64748B]">Компонент:</span>
                                            <select
                                              value={link.component || 'Core-Scoring'}
                                              onChange={(e) =>
                                                handleUpdateInProjectLink(
                                                  task.key,
                                                  link.id,
                                                  { component: e.target.value }
                                                )
                                              }
                                              className="ozon-inner-control ozon-inline-select px-1 py-0 text-[11px] font-semibold text-[#005BFF] cursor-pointer"
                                            >
                                              {allComponents.map((comp) => (
                                                <option key={comp} value={comp}>
                                                  {comp}
                                                </option>
                                              ))}
                                            </select>
                                          </span>
                                          <span className="text-[#CBD5E1]">·</span>
                                          {/* Direct inline Sprint selector for 'В проекте' sub-row (только Активные и Будущие спринты) */}
                                          <span
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 shrink-0 tabular-nums"
                                          >
                                            <span className="text-[#64748B]">Спринт:</span>
                                            <select
                                              value={
                                                link.sprint ||
                                                'FCRM Sprint 43 (11.11 – 25.11)'
                                              }
                                              onChange={(e) =>
                                                handleUpdateInProjectLink(
                                                  task.key,
                                                  link.id,
                                                  { sprint: e.target.value }
                                                )
                                              }
                                              className="ozon-inner-control ozon-inline-select px-1 py-0 text-[11px] font-semibold text-[#071026] cursor-pointer"
                                            >
                                              {link.sprint && !editableSprints.includes(link.sprint) && (
                                                <option value={link.sprint} disabled hidden>
                                                  {formatSprintWithStatus(link.sprint, true)}
                                                </option>
                                              )}
                                              {editableSprints.map((sp) => (
                                                <option key={sp} value={sp}>
                                                  {formatSprintWithStatus(sp, true)}
                                                </option>
                                              ))}
                                            </select>
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              )}
                                    </React.Fragment>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================================
            RESIZABLE RIGHT DOCKED SPLIT PANEL: JIRA STRUCTURE ISSUE DETAILS
           =================================================================== */}
        {selectedTask && (
          <>
            {/* Interactive Drag Resizer Handle */}
            <div
              onMouseDown={startResizing}
              className={`w-1.5 shrink-0 cursor-col-resize flex items-center justify-center group transition-colors ${
                isDraggingSidebar
                  ? 'bg-[#005BFF]'
                  : 'bg-[#E2E8F0] hover:bg-[#005BFF]'
              }`}
              title="Потяните влево или вправо для изменения ширины панели деталей задачи"
            >
              <GripVertical className="w-3 h-3 text-[#64748B] group-hover:text-white pointer-events-none" />
            </div>

            <aside
              style={{ width: `${sidebarWidth}px` }}
              className="shrink-0 bg-white flex flex-col h-full min-h-0 overflow-hidden"
            >
              {/* Inspector Header */}
              <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={`https://jit.o3.ru/browse/${selectedTask.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ozon-focusable rounded font-mono font-bold text-[#005BFF] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{selectedTask.key}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {renderIssueTypeBadge(selectedTask.issueType || 'Задача')}
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="font-mono text-[11px] text-[#64748B] tabular-nums">
                      Создана: {selectedTask.createdAt}
                    </span>
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="text-[11px] text-[#64748B]">
                      Автор: <strong className="text-[#071026]">{selectedTask.author.name}</strong>
                    </span>
                  </div>

                  {/* Editable Task Summary */}
                  <input
                    type="text"
                    value={selectedTask.summary}
                    onChange={(e) =>
                      handleUpdateTask(selectedTask.key, (t) => ({
                        ...t,
                        summary: e.target.value,
                      }))
                    }
                    className="ozon-focusable w-full text-sm font-bold text-[#071026] mt-1 leading-snug font-display bg-transparent border border-transparent hover:border-[#CBD5E1] focus:border-[#005BFF] focus:bg-white rounded-lg px-1.5 py-0.5 -ml-1.5 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={toggleSidebarExpandPreset}
                    className="ozon-btn-surface ozon-focusable p-1.5 cursor-pointer"
                    title={
                      sidebarWidth < 640
                        ? 'Расширить панель деталей'
                        : 'Стандартная ширина панели'
                    }
                  >
                    {sidebarWidth < 640 ? (
                      <Maximize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minimize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedTaskKey(null)}
                    className="ozon-btn-surface ozon-focusable p-1.5 text-[#64748B] hover:text-[#071026] cursor-pointer"
                    title="Закрыть панель деталей"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inspector Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-xs">
                {/* Status bar (Spec 3 Action Buttons) */}
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_COLUMNS.map((col) => {
                    const active = selectedTask.status === col.id;
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleMoveTaskStatus(selectedTask.key, col.id)}
                        className={`ozon-focusable px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                          active ? 'ozon-btn-tinted font-bold ring-1 ring-[#005BFF]/30' : 'ozon-btn-surface text-[#475569]'
                        }`}
                      >
                        {col.title}
                      </button>
                    );
                  })}
                </div>

                {/* ===========================================================
                    ACCORDION 1: Атрибуты задачи
                   =========================================================== */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSidebarSections((s) => ({
                        ...s,
                        attributes: !s.attributes,
                      }))
                    }
                    className="ozon-accordion-header ozon-focusable w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-[#071026] cursor-pointer"
                  >
                    <span>Атрибуты задачи (Тип задачи, Эпик, Компонент, Исполнитель, Спринт)</span>
                    {openSidebarSections.attributes ? (
                      <ChevronUp className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {openSidebarSections.attributes && (
                    <div className="p-3.5 space-y-2.5 bg-white">
                      {/* 0. Тип задачи (доступный в проекте FCRM) */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Тип задачи
                        </label>
                        <div className="col-span-8 flex items-center gap-2">
                          {renderIssueTypeBadge(selectedTask.issueType || 'Задача')}
                          <select
                            value={selectedTask.issueType || 'Задача'}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                issueType: e.target.value,
                              }))
                            }
                            className="ozon-focusable flex-1 px-2.5 py-1 text-xs font-semibold text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg cursor-pointer"
                          >
                            {PROJECT_ISSUE_TYPES.map((it) => (
                              <option key={it} value={it}>
                                {it}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 1. Спринт (только Активные и Будущие спринты) */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Спринт
                        </label>
                        <div className="col-span-8">
                          <select
                            value={selectedTask.sprint}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                sprint: e.target.value,
                              }))
                            }
                            className="ozon-focusable w-full px-2.5 py-1 text-xs font-medium text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg cursor-pointer"
                          >
                            {!editableSprints.includes(selectedTask.sprint) && (
                              <option value={selectedTask.sprint} disabled hidden>
                                {formatSprintWithStatus(selectedTask.sprint)}
                              </option>
                            )}
                            {editableSprints.map((sp) => (
                              <option key={sp} value={sp}>
                                {formatSprintWithStatus(sp)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 2. Эпик */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Эпик
                        </label>
                        <div className="col-span-8 flex gap-1.5">
                          <input
                            type="text"
                            value={selectedTask.epicKey}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                epicKey: e.target.value,
                              }))
                            }
                            placeholder="FCRM-4100"
                            className="ozon-focusable w-24 shrink-0 px-2 py-1 text-xs font-mono font-semibold text-[#005BFF] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg"
                          />
                          <input
                            list="fcrm-epics-list"
                            type="text"
                            value={selectedTask.epicName}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                epicName: e.target.value,
                              }))
                            }
                            placeholder="Название эпика"
                            className="ozon-focusable flex-1 min-w-0 px-2.5 py-1 text-xs font-medium text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg"
                          />
                          <datalist id="fcrm-epics-list">
                            {uniqueEpics.map((ep) => (
                              <option key={ep.epicKey} value={ep.epicName} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* 3. Компонент */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Компонент
                        </label>
                        <div className="col-span-8">
                          <select
                            value={selectedTask.component}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                component: e.target.value,
                              }))
                            }
                            className="ozon-focusable w-full px-2.5 py-1 text-xs font-semibold text-[#005BFF] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg cursor-pointer"
                          >
                            {allComponents.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 4. Исполнитель (оформлено аналогично Заказчик/Owner с кнопкой ОК) */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Исполнитель
                        </label>
                        <div className="col-span-8 flex gap-1.5">
                          <input
                            list="fcrm-assignees-list"
                            type="text"
                            value={selectedTask.assignee.name}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                assignee: { ...t.assignee, name: e.target.value },
                              }))
                            }
                            placeholder="🔍 Поиск Исполнителя по ФИО или логину..."
                            className="ozon-focusable flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg"
                          />
                          <button
                            type="button"
                            className="ozon-btn-tinted ozon-focusable px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            ОК
                          </button>
                          <datalist id="fcrm-assignees-list">
                            {uniqueAssignees.map((a) => (
                              <option key={a} value={a} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* 5. Заказчик/Owner */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Заказчик/Owner
                        </label>
                        <div className="col-span-8 flex gap-1.5">
                          <input
                            list="fcrm-customers-list"
                            type="text"
                            value={selectedTask.customer.name}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                customer: { ...t.customer, name: e.target.value },
                              }))
                            }
                            placeholder="🔍 Поиск Заказчик/Owner по ФИО или логину..."
                            className="ozon-focusable flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg"
                          />
                          <button
                            type="button"
                            className="ozon-btn-tinted ozon-focusable px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            ОК
                          </button>
                          <datalist id="fcrm-customers-list">
                            {uniqueCustomers.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* 6. Приоритет */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        <label className="col-span-4 text-[#64748B] font-medium">
                          Приоритет
                        </label>
                        <div className="col-span-8">
                          <select
                            value={selectedTask.priority}
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                priority: e.target.value as FcrmTask['priority'],
                              }))
                            }
                            className="ozon-focusable w-full px-2.5 py-1 text-xs font-semibold text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded-lg cursor-pointer"
                          >
                            <option value="Blocker">Blocker (Блокер)</option>
                            <option value="High">High (Высокий)</option>
                            <option value="Medium">Medium (Средний)</option>
                            <option value="Low">Low (Низкий)</option>
                          </select>
                        </div>
                      </div>

                      {/* 7. Описание задачи (с поддержкой форматирования Jira Wiki / Markdown) */}
                      <div className="pt-1.5 border-t border-[#EEF2F6] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                            Описание задачи
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsEditingDescription((v) => !v)}
                            className="ozon-btn-surface ozon-focusable px-2 py-0.5 text-[10.5px] font-semibold text-[#005BFF] cursor-pointer"
                          >
                            {isEditingDescription ? '👁 Просмотр' : '✎ Редактировать'}
                          </button>
                        </div>

                        {isEditingDescription ? (
                          <textarea
                            rows={6}
                            value={
                              selectedTask.description ??
                              `*Цель / Зачем*\nДать сотрудникам поддержки возможность вручную сбрасывать закэшированные данные в рамках задачи ${selectedTask.key} (${selectedTask.summary}).\n\n*Контекст*\nКомпонент: «${selectedTask.component}», эпик ${selectedTask.epicKey}.\n\n*Суть / Что делаем*\n1 заходит в карточку клиента в CRM\n2 выбирает действие и подтверждает операцию\nh2.\n*Связанные материалы*\nСм. https://jit.o3.ru/browse/OB-277222`
                            }
                            onChange={(e) =>
                              handleUpdateTask(selectedTask.key, (t) => ({
                                ...t,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Введите описание задачи (поддерживается разметка Jira: *жирный*, h2., списки, ссылки)..."
                            className="ozon-focusable w-full px-2.5 py-1.5 text-xs text-[#071026] bg-[#F8FAFC] border border-[#005BFF] rounded-lg resize-y leading-relaxed"
                          />
                        ) : (
                          <div
                            onDoubleClick={() => setIsEditingDescription(true)}
                            title="Двойной клик для редактирования описания"
                            className="p-2.5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg space-y-1.5 text-[11.5px] leading-relaxed text-[#071026] cursor-text"
                          >
                            {(
                              selectedTask.description ??
                              `*Цель / Зачем*\nДать сотрудникам поддержки возможность вручную сбрасывать закэшированные данные о получателях/плательщиках СБП в рамках задачи ${selectedTask.key}.\n\n*Контекст*\nДанные о доступных банках-получателях СБП сохраняются в кэше (${selectedTask.component}).\n\n*Суть / Что делаем*\nВ карточке клиента в CRM добавляется кнопка «Сбросить кэш» и подтверждение действия.\nh2.\n*Клиентский путь*\n1 клиент переводит в другой банк\n2 закрывает счет в банке\n3 обращается в поддержку — саппорт сбрасывает кэш (https://jit.o3.ru/browse/OB-277222)`
                            )
                              .split('\n')
                              .map((rawLine, idx) => {
                                const trimmed = rawLine.trim();
                                if (!trimmed) return null;
                                if (/^h[1-6]\.\s*$/i.test(trimmed) || /^-{3,}$/.test(trimmed)) {
                                  return <hr key={idx} className="border-t border-[#E2E8F0] my-1.5" />;
                                }
                                const boldHeading = trimmed.match(/^\*{1,2}([^*]+)\*{1,2}:?$/);
                                if (boldHeading) {
                                  return (
                                    <div key={idx} className="font-bold text-[#071026] text-[12px] pt-1">
                                      {boldHeading[1]}
                                    </div>
                                  );
                                }
                                const numMatch = trimmed.match(/^(?:(\d+)[.)]?)\s+(.+)$/);
                                if (numMatch) {
                                  return (
                                    <div key={idx} className="flex items-start gap-1.5 pl-1">
                                      <span className="font-mono font-bold text-[#005BFF] text-[11px] shrink-0">
                                        {numMatch[1]}.
                                      </span>
                                      <span>{numMatch[2]}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <p key={idx} className="text-[#1E293B]">
                                    {trimmed}
                                  </p>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ===========================================================
                    ACCORDION 2: Связи «Задача проекта» (JQL: labels = fcrm_umb_epic)
                   =========================================================== */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSidebarSections((s) => ({
                        ...s,
                        projectTasks: !s.projectTasks,
                      }))
                    }
                    className="ozon-accordion-header ozon-focusable w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-[#071026] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#005BFF]" />
                      <span>
                        Связи: «{config.linkTypeProjectTask}» ({selectedTask.projectTaskLinks.length})
                      </span>
                    </span>
                    {openSidebarSections.projectTasks ? (
                      <ChevronUp className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {openSidebarSections.projectTasks && (
                    <div className="p-3.5 space-y-2.5 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#64748B]">
                          Привязанные задачи из <code className="font-mono">fcrm_umb_epic</code>:
                        </span>
                        <a
                          href={FCRM_UMB_EPIC_JQL_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ozon-focusable rounded inline-flex items-center gap-1 text-[10.5px] font-mono font-semibold text-[#005BFF] hover:underline"
                        >
                          <span>Открыть JQL в Jira</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      {selectedTask.projectTaskLinks.length === 0 ? (
                        <p className="text-[11px] text-[#94A3B8]">
                          Нет привязанных задач проекта. Выберите задачу из списка ниже:
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {selectedTask.projectTaskLinks.map((link) => (
                            <div
                              key={link.id}
                              tabIndex={0}
                              className="ozon-row-item ozon-focusable rounded-xl p-2 flex items-center justify-between gap-2.5 border border-[#EEF2F6]"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#E5F0FF] text-[#005BFF] flex items-center justify-center shrink-0">
                                <FolderGit2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#071026] truncate">
                                  <a
                                    href={`https://jit.o3.ru/browse/${link.key}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ozon-inner-control font-mono font-bold text-[#005BFF] hover:underline mr-1.5"
                                  >
                                    {link.key}
                                  </a>
                                  <span>{link.summary}</span>
                                </div>
                                <div className="text-[11px] text-[#64748B]">
                                  Статус: {link.status} · labels = fcrm_umb_epic
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleRemoveLink(
                                    selectedTask.key,
                                    'projectTaskLinks',
                                    link.id
                                  )
                                }
                                className="ozon-inner-control ozon-btn-negative ozon-focusable px-2 py-1 text-[10.5px] font-semibold cursor-pointer shrink-0"
                                title="Отвязать задачу проекта"
                              >
                                Убрать
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick-Picker from JQL filter: https://jit.o3.ru/issues/?jql=labels+%3D+fcrm_umb_epic */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsUmbPickerOpen((v) => !v)}
                            className="ozon-focusable rounded inline-flex items-center gap-1 text-[11px] font-bold text-[#071026] hover:text-[#005BFF] cursor-pointer"
                          >
                            {isUmbPickerOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#005BFF]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[#005BFF]" />
                            )}
                            <span>Быстрый выбор из фильтра labels = fcrm_umb_epic</span>
                          </button>
                          <span className="text-[10.5px] font-mono text-[#64748B] tabular-nums">
                            {umbEpicCatalog.length} задач
                          </span>
                        </div>

                        {isUmbPickerOpen && (
                          <>
                            <div className="relative">
                              <Search className="w-3 h-3 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={umbSearchQuery}
                                onChange={(e) => setUmbSearchQuery(e.target.value)}
                                placeholder="Быстрый фильтр по задачам labels = fcrm_umb_epic..."
                                className="ozon-focusable w-full pl-6 pr-6 py-1 text-[11px] bg-white border border-[#CBD5E1] rounded-lg text-[#071026] placeholder:text-[#94A3B8]"
                              />
                              {umbSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setUmbSearchQuery('')}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#071026] cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="max-h-40 overflow-y-auto divide-y divide-[#EEF2F6] bg-white border border-[#E2E8F0] rounded-lg">
                              {filteredUmbEpicOptions.map((umbItem) => {
                                const isLinked = selectedTask.projectTaskLinks.some(
                                  (l) => l.key === umbItem.key
                                );
                                return (
                                  <button
                                    key={umbItem.key}
                                    type="button"
                                    onClick={() =>
                                      handleToggleUmbProjectTask(
                                        selectedTask.key,
                                        umbItem
                                      )
                                    }
                                    className={`ozon-row-item ozon-focusable w-full text-left px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] cursor-pointer ${
                                      isLinked ? 'ozon-row-selected' : ''
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 truncate">
                                      <span className="font-mono font-bold text-[#005BFF] mr-1.5">
                                        {umbItem.key}
                                      </span>
                                      <span className="truncate font-medium text-[#071026]">
                                        {umbItem.summary}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] text-[#64748B]">
                                        {umbItem.status}
                                      </span>
                                      <span
                                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                                          isLinked
                                            ? 'bg-[#005BFF] border-[#005BFF] text-white'
                                            : 'border-[#CBD5E1] bg-white text-transparent'
                                        }`}
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder="PROJ-1250"
                                value={newProjectTaskKey}
                                onChange={(e) => setNewProjectTaskKey(e.target.value)}
                                className="ozon-focusable w-24 px-2 py-1 text-[11px] font-mono bg-white border border-[#CBD5E1] rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Или добавить новую задачу fcrm_umb_epic..."
                                value={newProjectTaskSummary}
                                onChange={(e) => setNewProjectTaskSummary(e.target.value)}
                                className="ozon-focusable flex-1 px-2 py-1 text-[11px] bg-white border border-[#CBD5E1] rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddCustomProjectTaskLink(selectedTask.key)
                                }
                                className="ozon-btn-tinted ozon-focusable px-2.5 py-1 text-[11px] font-semibold shrink-0 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ===========================================================
                    ACCORDION 3: Связи «В проекте»
                   =========================================================== */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSidebarSections((s) => ({
                        ...s,
                        inProjectTasks: !s.inProjectTasks,
                      }))
                    }
                    className="ozon-accordion-header ozon-focusable w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-[#071026] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#005BFF]" />
                      <span>
                        Связи: «{config.linkTypeInProject}» ({selectedTask.inProjectLinks.length})
                      </span>
                    </span>
                    {openSidebarSections.inProjectTasks ? (
                      <ChevronUp className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="ozon-accordion-chevron w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {openSidebarSections.inProjectTasks && (
                    <div className="p-3.5 space-y-2.5 bg-white">
                      {selectedTask.inProjectLinks.length === 0 ? (
                        <p className="text-[11px] text-[#94A3B8]">
                          Нет связанных задач в блоке «{config.linkTypeInProject}»
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedTask.inProjectLinks.map((link) => (
                            <div
                              key={link.id}
                              tabIndex={0}
                              className="ozon-row-item ozon-focusable rounded-xl p-2.5 space-y-2 border border-[#E2E8F0]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-7 h-7 rounded-lg bg-[#E5F0FF] text-[#005BFF] flex items-center justify-center shrink-0">
                                    <Link2 className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-[#071026] truncate">
                                      <a
                                        href={`https://jit.o3.ru/browse/${link.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ozon-inner-control font-mono font-bold text-[#005BFF] hover:underline mr-1.5"
                                      >
                                        {link.key}
                                      </a>
                                      <span>{link.summary}</span>
                                    </div>
                                    <div className="text-[11px] text-[#64748B]">
                                      {link.component || '—'} · {link.sprint || '—'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleRemoveLink(
                                      selectedTask.key,
                                      'inProjectLinks',
                                      link.id
                                    )
                                  }
                                  className="ozon-inner-control ozon-btn-negative ozon-focusable px-2 py-1 text-[10.5px] font-semibold cursor-pointer shrink-0"
                                  title="Удалить связь"
                                >
                                  Убрать
                                </button>
                              </div>

                              {/* Статус, Компонент и Спринт задачи «В проекте» */}
                              <div className="grid grid-cols-12 gap-1.5 items-center pt-1.5 border-t border-[#EEF2F6]">
                                <div className="col-span-3">
                                  <label className="block text-[9.5px] text-[#64748B]">
                                    Статус
                                  </label>
                                  <select
                                    value={link.status}
                                    onChange={(e) =>
                                      handleUpdateInProjectLink(
                                        selectedTask.key,
                                        link.id,
                                        {
                                          status: e.target
                                            .value as LinkedIssueItem['status'],
                                        }
                                      )
                                    }
                                    className="ozon-inner-control ozon-focusable w-full px-1 py-0.5 text-[11px] font-medium bg-[#F5F7FA] border border-[#CBD5E1] rounded"
                                  >
                                    <option value="Открыто">Открыто</option>
                                    <option value="В работе">В работе</option>
                                    <option value="Ревью">Ревью</option>
                                    <option value="Тестирование">Тестирование</option>
                                    <option value="Готово">Готово</option>
                                  </select>
                                </div>

                                <div className="col-span-4">
                                  <label className="block text-[9.5px] text-[#64748B]">
                                    Компонент
                                  </label>
                                  <select
                                    value={link.component || 'Core-Scoring'}
                                    onChange={(e) =>
                                      handleUpdateInProjectLink(
                                        selectedTask.key,
                                        link.id,
                                        { component: e.target.value }
                                      )
                                    }
                                    className="ozon-inner-control ozon-focusable w-full px-1 py-0.5 text-[11px] font-semibold text-[#005BFF] bg-[#F5F7FA] border border-[#CBD5E1] rounded"
                                  >
                                    {allComponents.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="col-span-5">
                                  <label className="block text-[9.5px] text-[#64748B]">
                                    Спринт
                                  </label>
                                  <select
                                    value={
                                      link.sprint ||
                                      'FCRM Sprint 43 (11.11 – 25.11)'
                                    }
                                    onChange={(e) =>
                                      handleUpdateInProjectLink(
                                        selectedTask.key,
                                        link.id,
                                        { sprint: e.target.value }
                                      )
                                    }
                                    className="ozon-inner-control ozon-focusable w-full px-1 py-0.5 text-[11px] text-[#071026] bg-[#F5F7FA] border border-[#CBD5E1] rounded tabular-nums"
                                  >
                                    {link.sprint && !editableSprints.includes(link.sprint) && (
                                      <option value={link.sprint} disabled hidden>
                                        {formatSprintWithStatus(link.sprint)}
                                      </option>
                                    )}
                                    {editableSprints.map((sp) => (
                                      <option key={sp} value={sp}>
                                        {formatSprintWithStatus(sp)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Форма добавления новой задачи в блок «В проекте» со Спринтом и Компонентом */}
                      <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="FCRM-4920"
                            value={newInProjectKey}
                            onChange={(e) => setNewInProjectKey(e.target.value)}
                            className="ozon-focusable w-24 px-2 py-1 text-[11px] font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Название задачи в проекте..."
                            value={newInProjectSummary}
                            onChange={(e) => setNewInProjectSummary(e.target.value)}
                            className="ozon-focusable flex-1 px-2 py-1 text-[11px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            value={newInProjectComponent}
                            onChange={(e) => setNewInProjectComponent(e.target.value)}
                            className="ozon-focusable w-36 px-2 py-1 text-[11px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                          >
                            {allComponents.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newInProjectSprint}
                            onChange={(e) => setNewInProjectSprint(e.target.value)}
                            className="ozon-focusable flex-1 px-2 py-1 text-[11px] bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                          >
                            {editableSprints.map((sp) => (
                              <option key={sp} value={sp}>
                                {formatSprintWithStatus(sp)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddInProjectLink(selectedTask.key)}
                            className="ozon-btn-tinted ozon-focusable px-3 py-1 text-[11px] font-semibold shrink-0 cursor-pointer"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* =====================================================================
          HOW TO LAUNCH CHROME EXTENSION MODAL
         ===================================================================== */}
      {isInstallGuideOpen && (
        <div className="fixed inset-0 z-50 bg-[#071026]/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#071026] font-display">
                Как запустить расширение в Google Chrome
              </h2>
              <button
                onClick={() => setIsInstallGuideOpen(false)}
                className="ozon-btn-surface ozon-focusable p-1 text-[#64748B] hover:text-[#071026] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#334155]">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="font-bold text-[#071026] mb-1">
                  Шаг 1. Скачайте и распакуйте архив расширения
                </div>
                <p>
                  Нажмите кнопку <strong>«Скачать расширение .ZIP»</strong> — в архиве лежат готовые файлы Chrome Extension Manifest V3 (<code className="font-mono text-[#005BFF]">manifest.json</code>, <code className="font-mono text-[#005BFF]">content.js</code>, <code className="font-mono text-[#005BFF]">styles.css</code>, <code className="font-mono text-[#005BFF]">popup.html</code>). Распакуйте архив в любую папку на компьютере.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="font-bold text-[#071026]">
                  Шаг 2. Откройте управление расширениями в Chrome
                </div>
                <p>
                  Скопируйте адрес ниже, вставьте его в новую вкладку Chrome и нажмите Enter:
                </p>
                <div className="flex items-center justify-between bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5">
                  <code className="font-mono font-bold text-[#005BFF]">
                    chrome://extensions/
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('chrome://extensions/');
                      setCopiedChromeUrl(true);
                      setTimeout(() => setCopiedChromeUrl(false), 1600);
                    }}
                    className="ozon-btn-tinted ozon-focusable inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                  >
                    {copiedChromeUrl ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Скопировать адрес</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="font-bold text-[#071026] mb-1">
                  Шаг 3. Загрузите распакованную папку
                </div>
                <p>
                  Включите тумблер <strong>«Режим разработчика» (Developer mode)</strong> в правом верхнем углу страницы <code className="font-mono">chrome://extensions/</code>, затем нажмите кнопку <strong>«Загрузить распакованное расширение» (Load unpacked)</strong> и выберите папку с распакованными файлами.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#E8F1FF] border border-[#005BFF]/20">
                <div className="font-bold text-[#071026] mb-1">
                  Шаг 4. Откройте вашу доску FCRM на jit.o3.ru
                </div>
                <p>
                  Перейдите на{' '}
                  <a
                    href={config.boardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-[#005BFF] underline"
                  >
                    jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349&projectKey=FCRM#
                  </a>
                  . Расширение автоматически запустит компактный реестр Ozon Bank Structure и добавит в шапку Jira кнопку <strong>«Ozon Structure FCRM»</strong> для быстрого переключения.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                onClick={handleDownloadExtensionZip}
                className="ozon-btn-tinted ozon-focusable inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать .ZIP ещё раз</span>
              </button>
              <button
                onClick={() => setIsInstallGuideOpen(false)}
                className="ozon-btn-surface ozon-focusable px-4 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Понятно
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
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h2 className="text-base font-bold text-[#071026] font-display">
                Добавить задачу в реестр FCRM
              </h2>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="ozon-btn-surface ozon-focusable p-1 text-[#64748B] hover:text-[#071026] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">Ключ</label>
                  <input
                    type="text"
                    required
                    value={newTaskForm.key}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, key: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#071026] mb-1">
                    Название задачи *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Описание задачи..."
                    value={newTaskForm.summary}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, summary: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Ключ эпика
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.epicKey}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, epicKey: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
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
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Компонент
                  </label>
                  <select
                    value={newTaskForm.component}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, component: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  >
                    {allComponents.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Исполнитель
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.assigneeName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, assigneeName: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">Автор</label>
                  <input
                    type="text"
                    value={newTaskForm.authorName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, authorName: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">Спринт</label>
                  <select
                    value={newTaskForm.sprint}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, sprint: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  >
                    {editableSprints.map((sp) => (
                      <option key={sp} value={sp}>
                        {formatSprintWithStatus(sp)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Заказчик/Owner
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.customerName}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, customerName: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#071026] mb-1">
                    Подразделение (Заказчик/Owner)
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.customerDept}
                    onChange={(e) =>
                      setNewTaskForm((p) => ({ ...p, customerDept: e.target.value }))
                    }
                    className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              {/* Quick select from JQL labels = fcrm_umb_epic when creating a task */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <label className="block font-semibold text-[#071026] mb-1">
                  Задача проекта (быстрый выбор из JQL: labels = fcrm_umb_epic)
                </label>
                <select
                  value={newTaskForm.selectedUmbKey}
                  onChange={(e) =>
                    setNewTaskForm((p) => ({
                      ...p,
                      selectedUmbKey: e.target.value,
                    }))
                  }
                  className="ozon-focusable w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#071026]"
                >
                  <option value="">— Без привязки —</option>
                  {umbEpicCatalog.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.key} · {u.summary} ({u.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="ozon-btn-surface ozon-focusable px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="ozon-btn-tinted ozon-focusable px-4 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
