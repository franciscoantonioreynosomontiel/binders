import asyncio
from playwright.async_api import async_playwright

async def verify_v8():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        await page.add_init_script("""
            window._supabase = {
                from: (table) => ({
                    select: (query) => ({
                        eq: (col, val) => ({
                            single: () => Promise.resolve({ data: { id: 1, store_name: 'test-store' }, error: null }),
                            order: (col, opts) => Promise.resolve({ data: [
                                { id: 10, title: 'Album de Prueba', user_id: 1, cover_image_url: 'https://images.pokemontcg.io/base1/1_hires.png' }
                            ], error: null })
                        }),
                        order: (col, opts) => {
                            if (table === 'pages') return Promise.resolve({ data: [{ id: 1, album_id: 10, page_index: 1 }], error: null });
                            if (table === 'card_slots') return Promise.resolve({ data: [
                                { id: 100, page_id: 1, slot_index: 0, name: 'Pikachu', image_url: 'https://images.pokemontcg.io/base1/58_hires.png', rarity: 'Common', expansion: 'Base', condition: 'NM', quantity: 1, price: '10' }
                            ], error: null });
                            return Promise.resolve({ data: [], error: null });
                        }
                    })
                })
            };
        """);

        await page.goto('http://localhost:8080/docs/public.html?store=test-store')
        await page.wait_for_selector('.album')

        # Click a card
        card = await page.wait_for_selector('.card-slot img')
        await card.click()
        await page.wait_for_timeout(500)

        modal = await page.query_selector('#image-overlay.active')
        print(f"Modal active: {modal is not None}")

        # Drag a bit (under 25px) - should still open modal if it's a "sloppy click"
        await card.hover()
        await page.mouse.down()
        await page.mouse.move(0, 10, steps=5) # 10px move
        await page.mouse.up()
        await page.wait_for_timeout(500)
        modal_sloppy = await page.query_selector('#image-overlay.active')
        print(f"Modal active after 10px move: {modal_sloppy is not None}")

        # Drag more (over 25px) - should NOT open modal
        await page.click('#close-btn')
        await page.wait_for_timeout(500)

        await card.hover()
        await page.mouse.down()
        await page.mouse.move(0, 40, steps=5) # 40px move
        await page.mouse.up()
        await page.wait_for_timeout(500)
        modal_drag = await page.query_selector('#image-overlay.active')
        print(f"Modal active after 40px move: {modal_drag is not None}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_v8())
