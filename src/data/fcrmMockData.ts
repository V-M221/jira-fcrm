import { FcrmTask, ExtensionConfig, IssueStatus } from '../types/jira';

export const STATUS_COLUMNS: { id: IssueStatus; title: string; jiraStatusName: string }[] = [
  { id: 'todo', title: 'К выполнению', jiraStatusName: 'Open / To Do' },
  { id: 'in_progress', title: 'В работе', jiraStatusName: 'In Progress' },
  { id: 'review', title: 'Код-ревью', jiraStatusName: 'Code Review' },
  { id: 'testing', title: 'Тестирование', jiraStatusName: 'QA / Testing' },
  { id: 'done', title: 'Готово', jiraStatusName: 'Done / Closed' },
];

export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  boardUrl: 'https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349&projectKey=FCRM#',
  rapidViewId: '9349',
  projectKey: 'FCRM',
  epicFieldId: 'customfield_10006',
  sprintFieldId: 'customfield_10004',
  customerFieldId: 'customfield_14201',
  linkTypeProjectTask: 'Задача проекта',
  linkTypeInProject: 'В проекте',
  showSummary: true,
  showEpic: true,
  showComponent: true,
  showAssignee: true,
  showAuthor: true,
  showCustomer: true,
  showCreatedAt: true,
  showSprint: true,
  showProjectTaskLinks: true,
  showInProjectLinks: true,
  compactMode: false,
  widenColumns: true,
  columnMinWidthPx: 340,
  autoRefreshIntervalSec: 60,
};

export const INITIAL_FCRM_TASKS: FcrmTask[] = [
  {
    key: 'FCRM-4821',
    summary: 'Интеграция витрины скоринга МСБ с внешним контуром БКИ в карточке клиента FCRM',
    epicKey: 'FCRM-4100',
    epicName: 'Единый кредитный конвейер B2B',
    component: 'Core-Scoring',
    assignee: {
      name: 'Алексей Смирнов',
      login: 'asmirnov',
      role: 'Senior Go Developer',
    },
    author: {
      name: 'Мария Соколова',
      login: 'msokolova',
    },
    customer: {
      name: 'Дмитрий Волков',
      department: 'Дирекция кредитования МСБ Озон Банк',
    },
    createdAt: '24.10.2026 11:40',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'in_progress',
    priority: 'Критический',
    projectTaskLinks: [
      {
        id: 'pt-1',
        key: 'PROJ-1042',
        summary: 'Запуск экспресс-овердрафта для селлеров Ozon до 30 млн ₽',
        status: 'В работе',
      },
      {
        id: 'pt-2',
        key: 'PROJ-1089',
        summary: 'Соответствие требованиям ЦБ РФ по расчёту ПДН ЮЛ (4- квартал)',
        status: 'Открыто',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-1',
        key: 'FCRM-4825',
        summary: 'Миграция схемы PostgreSQL для хранения истории ответов НБКИ/ОКБ',
        status: 'Готово',
      },
      {
        id: 'ip-2',
        key: 'FCRM-4831',
        summary: 'Отрисовка блока лимитов и риск-грейда в правой панели оператора CRM',
        status: 'В работе',
      },
      {
        id: 'ip-3',
        key: 'BANK-9104',
        summary: 'Контракт gRPC шлюза scoring-adapter-v3',
        status: 'Ревью',
      },
    ],
  },
  {
    key: 'FCRM-4814',
    summary: 'Автоматическая маршрутизация обращений VIP-корпоратов по SLA 15 минут',
    epicKey: 'FCRM-4055',
    epicName: 'Омниканальный контакт-центр Банка',
    component: 'CRM-Routing',
    assignee: {
      name: 'Екатерина Лебедева',
      login: 'elebedeva',
      role: 'Backend Engineer',
    },
    author: {
      name: 'Игорь Козлов',
      login: 'ikozlov',
    },
    customer: {
      name: 'Анна Морозова',
      department: 'Департамент клиентского сервиса РКО',
    },
    createdAt: '21.10.2026 09:15',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'review',
    priority: 'Высокий',
    projectTaskLinks: [
      {
        id: 'pt-3',
        key: 'PROJ-980',
        summary: 'Премиальная линия поддержки Ozon Банк Бизнес',
        status: 'В работе',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-4',
        key: 'FCRM-4819',
        summary: 'Настройка Kafka-топика fcrm.sla.escalation.events',
        status: 'Готово',
      },
      {
        id: 'ip-5',
        key: 'FCRM-4840',
        summary: 'Индикатор таймера SLA в хедере тикета FCRM',
        status: 'Тестирование',
      },
    ],
  },
  {
    key: 'FCRM-4838',
    summary: 'Реализация массового подписания реестров зарплатного проекта через УКЭП в FCRM',
    epicKey: 'FCRM-4120',
    epicName: 'Зарплатный проект и ЭДО Ozon Банк',
    component: 'Sign-Crypto-UI',
    assignee: {
      name: 'Денис Новиков',
      login: 'dnovikov',
      role: 'Lead Frontend Engineer',
    },
    author: {
      name: 'Ольга Павлова',
      login: 'opavlova',
    },
    customer: {
      name: 'Сергей Кравцов',
      department: 'Дирекция транзакционного бизнеса',
    },
    createdAt: '29.10.2026 16:05',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'todo',
    priority: 'Высокий',
    projectTaskLinks: [
      {
        id: 'pt-4',
        key: 'PROJ-1120',
        summary: 'Масштабирование зарплатного проекта для корпоративных клиентов',
        status: 'В работе',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-6',
        key: 'FCRM-4839',
        summary: 'Поддержка плагина КриптоПро Browser Plug-in в модуле верификации',
        status: 'Открыто',
      },
      {
        id: 'ip-7',
        key: 'SEC-3310',
        summary: 'Аудит безопасности хранения хэшей откреплённых подписей PKCS#7',
        status: 'В работе',
      },
    ],
  },
  {
    key: 'FCRM-4799',
    summary: 'Модуль комплаенс-проверки 115-ФЗ: интерактивное дерево связанных контрагентов ИНН/ОГРН',
    epicKey: 'FCRM-3990',
    epicName: 'Антифрод и Финмониторинг FCRM',
    component: 'AntiFraud-UI',
    assignee: {
      name: 'Артём Захаров',
      login: 'azakharov',
      role: 'Fullstack Developer',
    },
    author: {
      name: 'Наталья Белова',
      login: 'nbelova',
    },
    customer: {
      name: 'Виктор Громов',
      department: 'Служба финансового мониторинга и комплаенса',
    },
    createdAt: '17.10.2026 14:22',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'testing',
    priority: 'Критический',
    projectTaskLinks: [
      {
        id: 'pt-5',
        key: 'PROJ-895',
        summary: 'Автоматизация реабилитации клиентов по 115-ФЗ в личном кабинете и CRM',
        status: 'Тестирование',
      },
      {
        id: 'pt-6',
        key: 'PROJ-912',
        summary: 'Единое досье юридического лица (KYC Граф)',
        status: 'В работе',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-8',
        key: 'FCRM-4802',
        summary: 'Экспорт заключения финмониторинга в PDF с водяным знаком',
        status: 'Готово',
      },
      {
        id: 'ip-9',
        key: 'FCRM-4810',
        summary: 'Кэширование ответов ЕГРЮЛ/Контур.Фокус в Redis на 24 часа',
        status: 'Готово',
      },
    ],
  },
  {
    key: 'FCRM-4782',
    summary: 'Унификация витрины тарифов эквайринга и СБП для менеджеров сопровождения FCRM',
    epicKey: 'FCRM-4012',
    epicName: 'Торговый эквайринг и B2B СБП',
    component: 'Tariff-Engine',
    assignee: {
      name: 'Полина Орлова',
      login: 'porlova',
      role: 'System Analyst / Go Dev',
    },
    author: {
      name: 'Мария Соколова',
      login: 'msokolova',
    },
    customer: {
      name: 'Роман Титов',
      department: 'Дирекция эквайринга и платёжных сервисов',
    },
    createdAt: '12.10.2026 10:50',
    sprint: 'FCRM Sprint 41 (14.10 – 28.10)',
    status: 'done',
    priority: 'Средний',
    projectTaskLinks: [
      {
        id: 'pt-7',
        key: 'PROJ-1005',
        summary: 'Снижение времени подключения B2B-эквайринга до 4 часов',
        status: 'Готово',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-10',
        key: 'FCRM-4785',
        summary: 'Валидатор MCC-кодов и расчёт индивидуальной ставки комиссии',
        status: 'Готово',
      },
      {
        id: 'ip-11',
        key: 'FCRM-4788',
        summary: 'Автотесты сценария смены тарифного плана с 1-го числа месяца',
        status: 'Готово',
      },
    ],
  },
  {
    key: 'FCRM-4844',
    summary: 'Синхронизация статусов валютного контроля ВЭД с карточкой сделки в FCRM',
    epicKey: 'FCRM-4150',
    epicName: 'Валютный контроль и ВЭД Контур',
    component: 'API-Gateway',
    assignee: {
      name: 'Алексей Смирнов',
      login: 'asmirnov',
      role: 'Senior Go Developer',
    },
    author: {
      name: 'Игорь Козлов',
      login: 'ikozlov',
    },
    customer: {
      name: 'Елена Кузнецова',
      department: 'Управление валютного контроля Озон Банк',
    },
    createdAt: '01.11.2026 18:30',
    sprint: 'FCRM Sprint 42 (28.10 – 11.11)',
    status: 'in_progress',
    priority: 'Высокий',
    projectTaskLinks: [
      {
        id: 'pt-8',
        key: 'PROJ-1155',
        summary: 'Цифровой ВЭД-ассистент для импортёров Ozon Global',
        status: 'В работе',
      },
    ],
    inProjectLinks: [
      {
        id: 'ip-12',
        key: 'FCRM-4846',
        summary: 'Парсинг ведомостей банковского контроля (ВБК) в формате XML ЦБ',
        status: 'В работе',
      },
      {
        id: 'ip-13',
        key: 'FCRM-4849',
        summary: 'Уведомления о приближении срока предоставления СПД за 3 рабочих дня',
        status: 'Открыто',
      },
    ],
  },
];

export const SAMPLE_JIRA_ISSUE_JSON = `{
  "id": "2948102",
  "key": "FCRM-4821",
  "self": "https://jit.o3.ru/rest/api/2/issue/2948102",
  "fields": {
    "summary": "Интеграция витрины скоринга МСБ с внешним контуром БКИ в карточке клиента FCRM",
    "created": "2026-10-24T11:40:18.000+0300",
    "components": [
      { "id": "41092", "name": "Core-Scoring" }
    ],
    "assignee": {
      "name": "asmirnov",
      "displayName": "Алексей Смирнов",
      "emailAddress": "asmirnov@ozon.ru"
    },
    "reporter": {
      "name": "msokolova",
      "displayName": "Мария Соколова"
    },
    "customfield_10006": "FCRM-4100",
    "customfield_10004": [
      "com.atlassian.greenhopper.service.sprint.Sprint@44a1[id=1942,rapidViewId=9349,state=ACTIVE,name=FCRM Sprint 42 (28.10 – 11.11)]"
    ],
    "customfield_14201": {
      "displayName": "Дмитрий Волков (Дирекция кредитования МСБ Озон Банк)"
    },
    "issuelinks": [
      {
        "id": "88101",
        "type": {
          "id": "10400",
          "name": "Задача проекта",
          "inward": "задача проекта",
          "outward": "задача проекта"
        },
        "outwardIssue": {
          "key": "PROJ-1042",
          "fields": {
            "summary": "Запуск экспресс-овердрафта для селлеров Ozon до 30 млн ₽",
            "status": { "name": "В работе" }
          }
        }
      },
      {
        "id": "88105",
        "type": {
          "id": "10401",
          "name": "В проекте",
          "inward": "входит в проект",
          "outward": "в проекте"
        },
        "outwardIssue": {
          "key": "FCRM-4825",
          "fields": {
            "summary": "Миграция схемы PostgreSQL для хранения истории ответов НБКИ/ОКБ",
            "status": { "name": "Готово" }
          }
        }
      }
    ]
  }
}`;
