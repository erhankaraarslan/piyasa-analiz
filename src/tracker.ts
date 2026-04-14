import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import type { DownloadState, DownloadedReport } from "./types.js";

export class Tracker {
  private state: DownloadState;

  constructor() {
    this.state = this.load();
  }

  private load(): DownloadState {
    try {
      const raw = fs.readFileSync(CONFIG.stateFile, "utf-8");
      return JSON.parse(raw) as DownloadState;
    } catch {
      return { reports: [] };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(CONFIG.stateFile), { recursive: true });
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(this.state, null, 2), "utf-8");
  }

  isDownloaded(url: string): boolean {
    return this.state.reports.some((r) => r.url === url);
  }

  add(report: DownloadedReport): void {
    this.state.reports.push(report);
    this.save();
  }

  getAll(): DownloadedReport[] {
    return [...this.state.reports];
  }
}
