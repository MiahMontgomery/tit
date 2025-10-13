import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';

export interface Action {
  type: 'click' | 'type' | 'wait';
  selector?: string;
  text?: string;
  timeout?: number;
}

export async function runActions({ 
  projectId, 
  runId, 
  url, 
  actions 
}: { 
  projectId: string; 
  runId: string; 
  url: string; 
  actions: Action[] 
}): Promise<{ screenshots: string[] }> {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const screenshots: string[] = [];
    const proofsDir = join('/data/proofs', projectId, runId);
    await mkdir(proofsDir, { recursive: true });
    
    // Capture initial screenshot
    const initialTimestamp = Date.now();
    const initialScreenshotPath = join(proofsDir, `${initialTimestamp}-0.png`);
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    screenshots.push(initialScreenshotPath);
    
    // Execute each action and capture screenshot
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      try {
        switch (action.type) {
          case 'click':
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
              await page.click(action.selector);
            }
            break;
          case 'type':
            if (action.selector && action.text) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
              await page.type(action.selector, action.text);
            }
            break;
          case 'wait':
            await page.waitForTimeout(action.timeout || 1000);
            break;
        }
        
        // Capture screenshot after action
        const timestamp = Date.now();
        const screenshotPath = join(proofsDir, `${timestamp}-${i + 1}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshots.push(screenshotPath);
        
      } catch (error) {
        console.error(`Action ${i} failed:`, error);
        // Still capture screenshot even if action failed
        const timestamp = Date.now();
        const screenshotPath = join(proofsDir, `${timestamp}-${i + 1}-error.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshots.push(screenshotPath);
      }
    }
    
    return { screenshots };
    
  } finally {
    await browser.close();
  }
}




