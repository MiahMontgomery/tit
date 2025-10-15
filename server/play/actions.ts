// Stub Playwright actions for PERSONAI
export async function goto(page: any, url: string) {
  // TODO: navigate to the given URL
  console.log('goto', url);
}

export async function type(page: any, selector: string, text: string) {
  // TODO: type text into an input
  console.log('type', selector, text);
}

export async function click(page: any, selector: string) {
  // TODO: click an element
  console.log('click', selector);
}

export async function waitForSelector(page: any, selector: string, timeout = 30000) {
  // TODO: wait for a selector
  console.log('waitForSelector', selector);
}

export async function screenshot(page: any, name: string) {
  // TODO: capture a screenshot
  console.log('screenshot', name);
}
