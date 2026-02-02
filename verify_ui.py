import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1280, "height": 800})

        # Landing Page
        await page.goto("http://localhost:8000/index.html")
        await page.screenshot(path="verification/landing_page.png")

        await browser.close()

asyncio.run(run())
