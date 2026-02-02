import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1280, "height": 800})

        # Admin Page
        await page.goto("http://localhost:8000/admin.html")
        await page.screenshot(path="verification/admin_decks_login.png")

        # Public Page
        await page.goto("http://localhost:8000/public.html?store=AdminStore")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="verification/public_albums.png")

        # Switch to Decks
        await page.click("button[data-view='decks']")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="verification/public_decks.png")

        await browser.close()

asyncio.run(run())
