from playwright.sync_api import sync_playwright
import os, time

def verify_admin_grid():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        mock_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="docs/css/style.css">
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        </head>
        <body>
            <div id="view-editor" class="admin-section active" style="width: 100%;">
                <div id="page-list" class="page-list-container">
                    <div class="admin-page-item"><h3>Página 1</h3><div class="admin-grid-preview"></div></div>
                    <div class="admin-page-item"><h3>Página 2</h3><div class="admin-grid-preview"></div></div>
                    <div class="admin-page-item"><h3>Página 3</h3><div class="admin-grid-preview"></div></div>
                    <div class="admin-page-item"><h3>Página 4</h3><div class="admin-grid-preview"></div></div>
                    <div class="admin-page-item"><h3>Página 5</h3><div class="admin-grid-preview"></div></div>
                </div>
            </div>
        </body>
        </html>
        """
        with open("verify_admin_grid.html", "w") as f:
            f.write(mock_html)

        page.goto(f"file://{os.getcwd()}/verify_admin_grid.html")
        time.sleep(1)

        page.screenshot(path="admin_grid_verified.png")
        browser.close()
        os.remove("verify_admin_grid.html")

if __name__ == "__main__":
    verify_admin_grid()
