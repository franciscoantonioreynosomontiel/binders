import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.add_init_script("""
            window.supabase = {
                from: (table) => {
                    return {
                        select: (query) => {
                            const mockData = {
                                'usuarios': [{ id: 1, store_name: 'test-store' }],
                                'albums': [{ id: 1, user_id: 1, title: 'Test Album' }],
                                'pages': [
                                    { id: 1, album_id: 1, page_index: 0 },
                                    { id: 2, album_id: 1, page_index: 1 }
                                ],
                                'card_slots': [
                                    { id: 1, page_id: 1, slot_index: 0, name: 'Card 1', image_url: 'https://via.placeholder.com/100' }
                                ],
                                'decks': []
                            };

                            const chain = {
                                eq: (col, val) => {
                                    chain.lastFilter = { col, val };
                                    return chain;
                                },
                                single: () => {
                                    const { col, val } = chain.lastFilter || {};
                                    const item = mockData[table] ? mockData[table].find(i => i[col] == val) : mockData[table][0];
                                    return Promise.resolve({ data: item, error: item ? null : { message: 'Not found' } });
                                },
                                order: (col, { ascending }) => chain,
                                then: (resolve) => {
                                    const { col, val } = chain.lastFilter || {};
                                    let filtered = mockData[table] || [];
                                    if (col) filtered = filtered.filter(i => i[col] == val);
                                    resolve({ data: filtered, error: null });
                                }
                            };
                            return chain;
                        }
                    };
                }
            };
            window._supabase = window.supabase;
        """)

        await page.goto('http://localhost:8080/public.html?store=test-store')

        await asyncio.sleep(5)
        await page.screenshot(path='/home/jules/verification/debug_page.png')

        # Check for card slots
        slots = await page.query_selector_all('.card-slot')
        print(f"Found {len(slots)} card slots.")

        if len(slots) > 0:
            print("Clicking first slot...")
            await slots[0].click(force=True)
            await asyncio.sleep(1)

            modal = await page.query_selector('#image-overlay')
            is_visible = await modal.is_visible()
            if is_visible:
                print("SUCCESS: Modal is visible.")
            else:
                print("FAILURE: Modal is NOT visible.")
                classes = await modal.evaluate('el => el.className')
                print(f"Modal classes: {classes}")
            await page.screenshot(path='/home/jules/verification/after_click.png')
        else:
            print("FAILURE: No card slots found.")

        await browser.close()

asyncio.run(run())
