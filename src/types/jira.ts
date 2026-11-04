export type IssueStatus = 'todo' | 'in_progress' | 'review' | 'testing' | 'done';

export interface LinkedIssueItem {
  id: string;
  key: string;
  summary: string;
  status: 'Открыто' | 'В работе' | 'Ревью' | 'Тестирование' | 'Готово';
  url?: string;
}

export interface FcrmTask {
  key: string;
  summary: string; // 1. Название задачи
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
  inProjectLinks: LinkedIssueItem[]; // 10. Блок связей "В проекте"
}

export interface ExtensionConfig {
  boardUrl: string;
  rapidViewId: string;
  projectKey: string;
  // Jira Custom Field mappings for jit.o3.ru REST API
  epicFieldId: string;
  sprintFieldId: string;
  customerFieldId: string;
  linkTypeProjectTask: string; // "Задача проекта"
  linkTypeInProject: string; // "В проекте"
  // Visibility toggles for the 10 mandatory fields
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
  // Visual density & layout
  compactMode: boolean;
  widenColumns: boolean;
  columnMinWidthPx: number;
  autoRefreshIntervalSec: number;
}
