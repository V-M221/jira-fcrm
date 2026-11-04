export type IssueStatus = 'todo' | 'in_progress' | 'review' | 'testing' | 'done' | 'canceled';

export type ProjectIssueType = 'Задача' | 'История' | 'Эпик' | 'Ошибка' | 'Аналитика';

export interface LinkedIssueItem {
  id: string;
  key: string;
  summary: string;
  status: 'Открыто' | 'В работе' | 'Ревью' | 'Тестирование' | 'Готово' | 'Отменено';
  issueType?: ProjectIssueType | string;
  component?: string;
  sprint?: string;
  url?: string;
}

export interface FcrmTask {
  key: string;
  summary: string; // 1. Название задачи
  description?: string; // Описание задачи
  issueType?: ProjectIssueType | string; // Тип задачи в проекте
  epicKey: string;
  epicName: string; // 2. Эпик
  component: string; // 3. Компонент
  assignee: {
    name: string;
    login: string;
    role: string;
  }; // 4. Исполнитель
  author: {
    name: string;
    login: string;
  }; // 5. Автор
  customer: {
    name: string;
    department: string;
  }; // 6. Заказчик
  createdAt: string; // 7. Дата создания (DD.MM.YYYY HH:mm)
  sprint: string; // 8. Спринт
  status: IssueStatus;
  priority: 'Критический' | 'Высокий' | 'Средний' | 'Низкий';
  projectTaskLinks: LinkedIssueItem[]; // 9. Блок связей "Задача проекта"
  inProjectLinks: LinkedIssueItem[]; // 10. Блок связей "В проекте" (название, статус, спринт, компонент)
}

export interface ExtensionConfig {
  boardUrl: string;
  rapidViewId: string;
  projectKey: string;
  epicFieldId: string;
  sprintFieldId: string;
  customerFieldId: string;
  linkTypeProjectTask: string; // "Задача проекта"
  linkTypeInProject: string; // "В проекте"
  showSummary: boolean;
  showEpic: boolean;
  showComponent: boolean;
  showAssignee: boolean;
  showAuthor: boolean;
  showCustomer: boolean;
  showCreatedAt: boolean;
  showSprint: boolean;
  showProjectTaskLinks: boolean;
  showInProjectLinks: boolean;
  compactMode: boolean;
  widenColumns: boolean;
  columnMinWidthPx: number;
  autoRefreshIntervalSec: number;
}
