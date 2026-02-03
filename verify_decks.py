import asyncio
from playwright.async_api import async_playwright
import os

async def verify_decks():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        await page.add_init_script("""
            window._supabase = {
                from: (table) => ({
                    select: (query) => ({
                        eq: (col, val) => ({
                            single: () => {
                                if (table === 'usuarios') return Promise.resolve({ data: { id: 1, store_name: 'test-store' }, error: null });
                                return Promise.resolve({ data: null, error: 'Not found' });
                            },
                            order: (col, opts) => {
                                if (table === 'decks') return Promise.resolve({ data: [
                                    { id: 101, name: 'Deck de Prueba', created_at: '2023-01-01', deck_cards: [
                                        { name: 'Pikachu Deck', image_url: 'https://images.pokemontcg.io/base1/58_hires.png', rarity: 'Common', expansion: 'Base', condition: 'NM', quantity: 1, price: '10' }
                                    ]}
                                ], error: null });
                                return Promise.resolve({ data: [], error: null });
                            }
                        }),
                        order: (col, opts) => Promise.resolve({ data: [], error: null })
                    })
                })
            };
        """);

        await page.goto('http://localhost:8080/docs/public.html?store=test-store&view=decks')

        await page.wait_for_selector('.deck-public-item', timeout=10000)
        print("Deck item found")

        slide = await page.wait_for_selector('.swiper-slide.card-slot')
        print(f"Deck card found: {await slide.is_visible()}")

        # Click the slide image
        await slide.click()
        await page.wait_for_timeout(1000)

        modal = await page.query_selector('#image-overlay.active')
        print(f"Modal active after deck click: {modal is not None}")
        if modal:
            name = await page.inner_text('#card-name')
            print(f"Card name in modal: {name}")

        await page.screenshot(path='/home/jules/verification/deck_modal.png')
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_decks())
