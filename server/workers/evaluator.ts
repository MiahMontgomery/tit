import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function runEvaluator({ projectId, runId, url }: {
  projectId: string;
  runId: string;
  url: string;
}): Promise<{ screenshotPath: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to the preview URL
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Create proofs directory
    const proofsDir = join('/data/proofs', projectId, runId);
    await mkdir(proofsDir, { recursive: true });
    
    // Generate screenshot filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = join(proofsDir, `${timestamp}.png`);
    
    // Take screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });
    
    return { screenshotPath };
  } finally {
    await browser.close();
  }
}




