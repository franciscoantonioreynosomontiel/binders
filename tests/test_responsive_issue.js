const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to a small mobile size
  await page.setViewportSize({ width: 360, height: 640 });

  // Load the page
  // We need to mock the Supabase data or just test the CSS on a dummy structure
  const filePath = 'file://' + path.resolve('docs/public.html');
  await page.goto(filePath);

  // Inject a dummy album to test the responsive CSS
  await page.evaluate(() => {
    const container = document.getElementById('albums-container');
    container.innerHTML = `
        <div class="public-album-item" style="border: 1px solid red;">
            <div class="public-album-header">Test Album</div>
            <div class="album-wrapper">
                <div class="album" style="width: 600px; height: 420px; background: blue;"></div>
            </div>
        </div>
    `;
  });

  // Wait a bit for layout
  await page.waitForTimeout(500);

  // Check for horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  const albumWrapperWidth = await page.evaluate(() => {
    return document.querySelector('.album-wrapper').getBoundingClientRect().width;
  });

  const albumItemWidth = await page.evaluate(() => {
    return document.querySelector('.public-album-item').getBoundingClientRect().width;
  });

  console.log(`Viewport Width: 360`);
  console.log(`Album Item Width: ${albumItemWidth}`);
  console.log(`Album Wrapper Width: ${albumWrapperWidth}`);
  console.log(`Has Horizontal Scroll: ${hasHorizontalScroll}`);

  await page.screenshot({ path: 'tests/responsive_test_before.png' });

  await browser.close();
})();
