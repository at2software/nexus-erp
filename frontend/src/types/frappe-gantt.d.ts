declare module 'frappe-gantt' {
  interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
  }

  interface GanttOptions {
    header_height?: number;
    column_width?: number;
    step?: number;
    view_modes?: string[];
    bar_height?: number;
    bar_corner_radius?: number;
    arrow_curve?: number;
    padding?: number;
    view_mode?: string;
    date_format?: string;
    custom_popup_html?: (task: any) => string;
    on_click?: (task: any) => void;
    on_date_change?: (task: any, start: Date, end: Date) => void;
    on_progress_change?: (task: any, progress: number) => void;
    on_view_change?: (mode: string) => void;
  }

  class Gantt {
    constructor(element: HTMLElement, tasks: GanttTask[], options?: GanttOptions);
    refresh(tasks: GanttTask[]): void;
    change_view_mode(mode: string): void;
  }

  export = Gantt;
}