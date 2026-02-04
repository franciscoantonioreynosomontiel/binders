import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # Mock Supabase
        mock_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="docs/css/style.css">
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script src="docs/js/turn.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js"></script>
            <script>
                window._supabase = {
                    from: (table) => ({
                        select: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: { id: 1, store_name: 'test' }, error: null }),
                                neq: () => ({ order: () => Promise.resolve({
                                    data: table === 'albums' ? [
                                        { id: 1, title: 'Public Album', is_public: true },
                                        { id: 2, title: 'Private Album', is_public: false }
                                    ] : [
                                        { id: 1, name: 'Public Deck', is_public: true, deck_cards: [{name: 'Pikachu', image_url: ''}] }
                                    ],
                                    error: null
                                }) })
                            }),
                            order: () => Promise.resolve({ data: [], error: null })
                        })
                    })
                };
                // Mock Swiper
                window.Swiper = function(selector, config) {
                    this.slideTo = (index) => { console.log('Swiper slideTo: ' + index); };
                    const el = document.querySelector(selector);
                    if (el) el.swiper = this;
                };
            </script>
        </head>
        <body class="public-body">
            <header class="public-header">
                <input type="text" id="search-input">
            </header>
            <div id="albums-container"></div>
            <div id="decks-container"></div>
            <script src="docs/js/app.js"></script>
            <script>
                // Manual override for mock testing
                $(document).ready(() => {
                    // Inject a mock album with data-name
                    $('#albums-container').append(`
                        <div class="public-album-item">
                            <div class="public-album-header">Public Album</div>
                            <div class="album" id="album-1">
                                <div class="page">Page 1</div>
                                <div class="page">
                                    <div class="card-slot" data-name="Charizard">Charizard</div>
                                </div>
                            </div>
                        </div>
                    `);
                    $('#album-1').turn({ display: 'double', width: 600, height: 400 });

                    // Inject a mock deck
                    $('#decks-container').append(`
                        <div class="deck-public-item">
                            <h3>Public Deck</h3>
                            <div class="swiper">
                                <div class="swiper-wrapper">
                                    <div class="swiper-slide card-slot" data-name="Pikachu">Pikachu</div>
                                </div>
                            </div>
                        </div>
                    `);
                    new Swiper('.swiper', {});
                });
            </script>
        </body>
        </html>
        """
        with open("verify_new_features.html", "w") as f:
            f.write(mock_html)

        await page.goto(f"file://{os.getcwd()}/verify_new_features.html?store=test")
        await asyncio.sleep(2)

        # Test 1: Search Charizard (Album)
        print("Searching for Charizard...")
        await page.fill("#search-input", "Charizard")
        await asyncio.sleep(1)

        current_page = await page.evaluate("$('#album-1').turn('page')")
        print(f"Album Page: {current_page}")

        # Test 2: Search Pikachu (Deck)
        print("Searching for Pikachu...")
        page.on("console", lambda msg: print(f"BROWSER: {msg.text}") if "Swiper" in msg.text else None)
        await page.fill("#search-input", "Pikachu")
        await asyncio.sleep(1)

        await browser.close()
        os.remove("verify_new_features.html")

if __name__ == "__main__":
    asyncio.run(verify())
