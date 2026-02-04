from playwright.sync_api import sync_playwright
import os, time

def verify_search():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Real files with mock Supabase data
        mock_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="docs/css/style.css">
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script src="docs/js/turn.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js"></script>
            <script>
                window._supabase = {{
                    from: (table) => ({{
                        select: () => ({{
                            eq: () => ({{
                                single: () => Promise.resolve({{ data: {{ id: 1, store_name: 'test' }}, error: null }}),
                                neq: () => ({{ order: () => Promise.resolve({{
                                    data: table === 'albums' ? [
                                        {{ id: 1, title: 'Test Album', is_public: true }}
                                    ] : [
                                        {{ id: 1, name: 'Test Deck', is_public: true, deck_cards: [{{name: 'Pikachu', image_url: ''}}] }}
                                    ],
                                    error: null
                                }}) }})
                            }}),
                            order: () => Promise.resolve({{ data: [], error: null }})
                        }})
                    }})
                }};
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
                $(document).ready(() => {{
                    $('#albums-container').append(`
                        <div class="public-album-item">
                            <div class="public-album-header">Test Album</div>
                            <div class="album" id="album-1">
                                <div class="page">Cover</div>
                                <div class="page">
                                    <div class="card-slot" data-name="Pikachu">Pikachu</div>
                                </div>
                            </div>
                        </div>
                    `);
                    $('#album-1').turn({{ display: 'double', width: 600, height: 400 }});
                }});
            </script>
        </body>
        </html>
        """
        with open("verify_unified_search.html", "w") as f:
            f.write(mock_html)

        page.goto(f"file://{os.getcwd()}/verify_unified_search.html?store=test")
        time.sleep(2)

        # Initial page should be 1
        print("Page before search:", page.evaluate("$('#album-1').turn('page')"))

        # Search for Pikachu
        page.fill("#search-input", "Pikachu")
        time.sleep(1)

        # Page should have flipped to 2
        final_page = page.evaluate("$('#album-1').turn('page')")
        print("Page after search:", final_page)

        page.screenshot(path="search_autoflip_verified.png")

        browser.close()
        os.remove("verify_unified_search.html")

if __name__ == "__main__":
    verify_search()
