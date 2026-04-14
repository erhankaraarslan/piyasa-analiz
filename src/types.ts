export interface Report {
  title: string;
  url: string;
  date: string;
  pdfUrl: string;
  source: string;
  category: string;
}

export interface DownloadedReport {
  url: string;
  title: string;
  downloadedAt: string;
  filePath: string;
}

export interface DownloadState {
  reports: DownloadedReport[];
}

export interface ScraperSource {
  name: string;
  slug: string;
  categories: ScraperCategory[];
}

export interface ScraperCategory {
  name: string;
  slug: string;
  url: string;
}
