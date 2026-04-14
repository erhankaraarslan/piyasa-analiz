import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import type { Report } from "./types.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export async function downloadReport(
  page: Page,
  report: Report,
  outputDir: string
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  const datePrefix = report.date.replace(/\//g, "-");
  const slug = slugify(report.title);
  const fileName = `${datePrefix}_${slug}.pdf`;
  const filePath = path.join(outputDir, fileName);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Navigate to the PDF URL and capture the download
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.goto(report.pdfUrl);
  const download = await downloadPromise;
  await download.saveAs(filePath);

  return filePath;
}

export async function downloadReportDirect(
  report: Report,
  outputDir: string,
  cookies: { name: string; value: string; domain: string }[]
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  const datePrefix = report.date.replace(/\//g, "-");
  const slug = slugify(report.title);
  const fileName = `${datePrefix}_${slug}.pdf`;
  const filePath = path.join(outputDir, fileName);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Use fetch with cookies for direct PDF download
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const response = await fetch(report.pdfUrl, {
    headers: { Cookie: cookieHeader },
  });

  if (!response.ok) {
    throw new Error(`PDF indirilemedi: ${response.status} ${response.statusText} — ${report.pdfUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
