"""Screenshot every preview state in a checker --out folder.

Usage: python3 checker/screenshot.py out/reference [--dark]
Writes <state>.png next to each <state>.html.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

folder = Path(sys.argv[1])
dark = "--dark" in sys.argv

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 900, "height": 600}, device_scale_factor=2)
    for html in sorted(folder.glob("*.html")):
        page.goto(html.resolve().as_uri())
        if dark:
            page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
        suffix = "-dark" if dark else ""
        page.screenshot(path=str(html.with_name(f"{html.stem}{suffix}.png")), full_page=True)
    browser.close()
