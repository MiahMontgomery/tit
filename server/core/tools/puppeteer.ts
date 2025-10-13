import puppeteer from "puppeteer";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";

if (!process.env.FILE_STORAGE_DIR) {
  throw new Error("FILE_STORAGE_DIR environment variable is required");
}

const STORAGE_DIR = process.env.FILE_STORAGE_DIR;

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    url: string;
    timestamp: string;
  };
}

export class PuppeteerClient {
  private browser: puppeteer.Browser | null = null;

  async initialize(): Promise<void> {
    if (this.browser) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log("✅ Puppeteer browser initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Puppeteer:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async takeScreenshot(url: string, options: {
    width?: number;
    height?: number;
    fullPage?: boolean;
    filename?: string;
  } = {}): Promise<ScreenshotResult> {
    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error("Browser not initialized");
      }

      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080
      });

      // Navigate to URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait a bit for any dynamic content
      await page.waitForTimeout(2000);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `screenshot-${timestamp}.png`;
      const filePath = join(STORAGE_DIR, filename);

      // Ensure storage directory exists
      if (!existsSync(STORAGE_DIR)) {
        await mkdir(STORAGE_DIR, { recursive: true });
      }

      // Take screenshot
      await page.screenshot({
        path: filePath,
        fullPage: options.fullPage || false,
        type: 'png'
      });

      // Get page info
      const pageInfo = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        width: window.innerWidth,
        height: window.innerHeight
      }));

      await page.close();

      return {
        success: true,
        filePath,
        metadata: {
          width: pageInfo.width,
          height: pageInfo.height,
          url: pageInfo.url,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async takeElementScreenshot(url: string, selector: string, options: {
    filename?: string;
  } = {}): Promise<ScreenshotResult> {
    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error("Browser not initialized");
      }

      const page = await this.browser.newPage();
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for element to be visible
      await page.waitForSelector(selector, { timeout: 10000 });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `element-screenshot-${timestamp}.png`;
      const filePath = join(STORAGE_DIR, filename);

      // Ensure storage directory exists
      if (!existsSync(STORAGE_DIR)) {
        await mkdir(STORAGE_DIR, { recursive: true });
      }

      // Take element screenshot
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.screenshot({
        path: filePath,
        type: 'png'
      });

      await page.close();

      return {
        success: true,
        filePath
      };

    } catch (error) {
      console.error("Element screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getPageContent(url: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error("Browser not initialized");
      }

      const page = await this.browser.newPage();
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      const content = await page.content();
      await page.close();

      return {
        success: true,
        content
      };

    } catch (error) {
      console.error("Page content error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const puppeteerClient = new PuppeteerClient();
