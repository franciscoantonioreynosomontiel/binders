const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone 6/7/8 size
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  // Use a local server or file path. Since I'm in a sandbox, I'll assume a local server is running or use file://
  const filePath = 'file://' + path.resolve('docs/public.html') + '?store=toonShop';

  try {
    console.log('Navigating to:', filePath);
    await page.goto(filePath, { waitUntil: 'networkidle' });

    // Wait for the album to be initialized (images loaded, turn.js called)
    await page.waitForTimeout(3000);

    // Check if the album is visible
    const album = await page.$('.album');
    if (!album) {
        console.error('Album not found');
        await browser.close();
        process.exit(1);
    }

    // On mobile, the first page is the cover. We need to turn to the first grid page.
    // Or just click the cover to turn? No, let's turn programmatically or wait.
    // Actually, let's just click the cover (Page 1) to go to Page 2&3.
    console.log('Clicking cover...');
    await page.click('.cover-page');
    await page.waitForTimeout(1500); // Wait for turn animation

    // Now on Page 2 (Left) and Page 3 (Right).
    // Let's try to click a card in Column 1 of Page 2.
    // Column 1 is the first column of the grid-container on the left page.
    const firstColCard = await page.$('.page:nth-child(2) .grid-container .card-slot:first-child');
    if (firstColCard) {
        console.log('Clicking card in Column 1...');
        const box = await firstColCard.boundingBox();
        console.log('Card box:', box);

        // Click the card
        await page.click('.page:nth-child(2) .grid-container .card-slot:first-child');
        await page.waitForTimeout(500);

        const isModalActive = await page.evaluate(() => document.querySelector('#image-overlay').classList.contains('active'));
        console.log('Is modal active after click?', isModalActive);

        await page.screenshot({ path: 'verify_click_mobile.png' });

        if (!isModalActive) {
            console.error('FAILED: Modal did not open when clicking card in Col 1');
            // Try clicking the second column
            console.log('Trying Col 2...');
            await page.click('.page:nth-child(2) .grid-container .card-slot:nth-child(2)');
            await page.waitForTimeout(500);
            const isModalActive2 = await page.evaluate(() => document.querySelector('#image-overlay').classList.contains('active'));
            console.log('Is modal active after Col 2 click?', isModalActive2);
        }
    } else {
        console.error('Card slot not found on Page 2');
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
