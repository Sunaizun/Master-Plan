"""
End-to-end checks of the built standalone page with headless Chromium.

Runs the main workflows twice: once with browser storage, once with a fake
claude.ai `db` capability injected (to exercise the cloud storage adapter).
Usage: python3 tests/e2e.py [path-to-standalone.html]
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "masters-os-standalone.html"
OUT = ROOT / "dist" / "screens"
OUT.mkdir(parents=True, exist_ok=True)

FAKE_CLAUDE = """
(() => {
  const KEY = '__fake_db__';
  const load = () => JSON.parse(localStorage.getItem(KEY) || '{}');
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const snap = (path, data) => ({ id: path.split('/').pop(), exists: data !== undefined, data: () => data, metadata: {} });
  const docRef = (path) => ({
    id: path.split('/').pop(), path,
    async get() { return snap(path, load()[path]); },
    async set(v) { const d = load(); d[path] = JSON.parse(JSON.stringify(v)); save(d); window.__writes = (window.__writes||0)+1; },
    async update(v) { const d = load(); d[path] = { ...(d[path]||{}), ...v }; save(d); },
    async delete() { const d = load(); delete d[path]; save(d); },
    collection(sub) { return colRef(path + '/' + sub); },
  });
  const colRef = (path) => ({
    path,
    doc(id) { return docRef(path + '/' + (id || Math.random().toString(36).slice(2))); },
    async get() {
      const d = load(); const depth = path.split('/').length + 1;
      const docs = Object.keys(d).filter(k => k.startsWith(path + '/') && k.split('/').length === depth).sort().map(k => snap(k, d[k]));
      return { docs, size: docs.length, empty: !docs.length };
    },
  });
  const db = { doc: docRef, collection: colRef };
  const user = { id: async () => 'viewer123', isOwner: async () => true };
  window.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : null) };
})();
"""


def run(mode: str):
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1366, "height": 900})
        if mode == "cloud":
            ctx.add_init_script(FAKE_CLAUDE)
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.on("pageerror", lambda e: errors.append(str(e)))
        url = PAGE.as_uri()
        page.goto(url)

        # 1. Welcome → seed
        page.get_by_role("button", name="Load my starter workspace").click()
        page.get_by_role("heading", name="Dashboard").wait_for()
        assert page.get_by_text("Next important deadline").is_visible()
        page.screenshot(path=str(OUT / f"{mode}-dashboard.png"), full_page=True)

        # 2. Every route renders
        for route, heading in [
            ("review", "Weekly review"),
            ("universities", "Universities"),
            ("applications", "Applications"),
            ("requirements", "Requirements"),
            ("tasks", "Tasks & Calendar"),
            ("ielts", "IELTS Academic"),
            ("documents", "Documents"),
            ("workspace", "SOP & CV"),
            ("recommendations", "Recommendations"),
            ("bolashak", "Bolashak"),
            ("budget", "Budget"),
            ("prefs", "Settings"),
            ("program-p_card", "Cardiff University"),
        ]:
            page.evaluate(f"location.hash = '{route}'")
            page.get_by_role("heading", name=heading, exact=True).first.wait_for(timeout=5000)
            if mode == "local" and route in ("program-p_card", "applications", "ielts", "tasks", "bolashak", "budget", "documents"):
                page.screenshot(path=str(OUT / f"{mode}-{route}.png"), full_page=True)

        # 3. Requirement completion updates readiness (Cardiff)
        page.evaluate("location.hash = 'program-p_card'")
        page.get_by_role("heading", name="Cardiff University").wait_for()
        before = page.locator(".summary-cell.wide .progress-num").inner_text()
        page.select_option("#rq-st-r_card_ielts", "complete")
        page.wait_for_timeout(200)
        after = page.locator(".summary-cell.wide .progress-num").inner_text()
        assert int(after.rstrip("%")) > int(before.rstrip("%")), (before, after)

        # Unverified + complete must not count
        page.select_option("#rq-st-r_card_living", "complete")
        page.wait_for_timeout(200)
        assert page.locator(".summary-cell.wide .progress-num").inner_text() == after, "unverified row counted"

        # 4. Completing a linked verification task verifies the requirement (UB GPA)
        page.evaluate("location.hash = 'tasks'")
        page.get_by_role("heading", name="Tasks & Calendar").wait_for()
        page.locator("#chk-t_ub_verify").click()
        page.wait_for_timeout(200)
        page.evaluate("location.hash = 'program-p_ub'")
        page.get_by_role("heading", name="University at Buffalo (SUNY)").wait_for()
        row = page.locator("tr", has=page.locator("#rq-st-r_ub_gpa"))
        assert "Verified" in row.inner_text(), row.inner_text()

        # 5. Quick task via keyboard
        page.keyboard.press("Escape")
        page.locator("body").click(position={"x": 5, "y": 5})
        page.keyboard.press("n")
        page.locator("#qt-title").fill("E2E: email Cardiff admissions")
        page.get_by_role("button", name="Add task").click()
        page.evaluate("location.hash = 'tasks'")
        assert page.get_by_text("E2E: email Cardiff admissions").first.is_visible()

        # 6. Validation: empty title is rejected
        page.get_by_role("button", name="New task").click()
        page.get_by_role("button", name="Save task").click()
        assert page.get_by_text("Task title is required").is_visible()
        page.get_by_role("button", name="Cancel").click()

        # 7. Calendar & timeline views
        page.get_by_role("tab", name="Calendar").click()
        assert page.locator(".cal-day").count() == 42
        page.get_by_role("tab", name="Timeline").click()
        assert page.locator(".tl-item").count() > 5

        # 8. IELTS: add a mock with bands → overall computed
        page.evaluate("location.hash = 'ielts'")
        page.get_by_role("heading", name="IELTS Academic").wait_for()
        page.get_by_role("button", name="Add test result").click()
        page.fill("#ia-date", "2026-10-28")
        page.fill("#ia-L", "7")
        page.fill("#ia-R", "6.5")
        page.fill("#ia-W", "6")
        page.fill("#ia-S", "6.5")
        assert page.input_value("#ia-overall") == "6.5"
        page.get_by_role("button", name="Save", exact=True).click()
        page.wait_for_timeout(200)
        assert page.locator("table").first.get_by_text("Mock").is_visible()
        page.get_by_role("button", name="+ Log practice").click()
        page.fill("#pl-act", "Cambridge 18 Test 1 Listening")
        page.fill("#pl-min", "45")
        page.fill("#pl-mis", "Missed plural -s in section 1")
        page.get_by_role("button", name="Save", exact=True).click()
        page.wait_for_timeout(200)
        assert page.get_by_text("Cambridge 18 Test 1 Listening").is_visible()

        # 9. SOP workspace: create draft, type, word count
        page.evaluate("location.hash = 'workspace'")
        page.get_by_role("button", name="Master SOP").click()
        page.get_by_role("button", name="Start version 1").click()
        page.fill("#ws-text", "I want to build reliable machine learning systems.")
        assert "8 words" in page.locator(".editor-foot").inner_text()

        # 10. Budget: add exchange rate → totals convert
        page.evaluate("location.hash = 'budget'")
        page.get_by_role("heading", name="Budget", exact=True).wait_for()
        page.fill("#bg-usd", "500")
        page.locator("#bg-usd").press("Enter")
        page.wait_for_timeout(200)

        # 11. Persistence: wait for save, reload, data still there
        page.wait_for_timeout(1500)
        page.reload()
        page.locator(".shell").wait_for(timeout=15000)
        page.evaluate("location.hash = 'tasks'")
        assert page.get_by_text("E2E: email Cardiff admissions").first.is_visible(), "task not persisted"
        page.evaluate("location.hash = 'workspace'")
        page.get_by_role("button", name="Master SOP").click()
        assert page.input_value("#ws-text").startswith("I want to build"), "SOP text not persisted"
        page.evaluate("location.hash = 'program-p_card'")
        page.get_by_role("heading", name="Cardiff University").wait_for()
        assert page.locator("#rq-st-r_card_ielts").input_value() == "complete"

        if mode == "cloud":
            stored = json.loads(page.evaluate("localStorage.getItem('__fake_db__')"))
            keys = sorted(stored.keys())
            assert all(k.startswith("data/users/viewer123/") for k in keys), keys[:5]
            assert any("/texts/v/" in k for k in keys), "SOP text not in texts collection"
            assert any(k.endswith("/req.p_card") for k in keys)
            assert not any(k.startswith("masters-os:") for k in page.evaluate("Object.keys(localStorage)")), "cloud mode wrote to localStorage"

        # 12. Mobile width: no horizontal scroll on key pages
        page.set_viewport_size({"width": 390, "height": 844})
        for route in ["dashboard", "program-p_card", "tasks", "ielts", "budget", "applications"]:
            page.evaluate(f"location.hash = '{route}'")
            page.wait_for_timeout(250)
            sw = page.evaluate("document.documentElement.scrollWidth")
            assert sw <= 392, f"{route} scrolls horizontally on mobile ({sw}px)"
            if mode == "local" and route in ("dashboard", "program-p_card"):
                page.screenshot(path=str(OUT / f"{mode}-mobile-{route}.png"), full_page=False)

        # Dark mode screenshot
        if mode == "local":
            page.set_viewport_size({"width": 1366, "height": 900})
            page.emulate_media(color_scheme="dark")
            page.evaluate("location.hash = 'dashboard'")
            page.wait_for_timeout(300)
            page.screenshot(path=str(OUT / "local-dark-dashboard.png"), full_page=False)

        browser.close()
    real = [e for e in errors if "fonts.googleapis" not in e and "ERR_" not in e]
    assert not real, f"console errors: {real}"
    print(f"  ✓ {mode} workflows passed")


if __name__ == "__main__":
    run("local")
    run("cloud")
    print("E2E passed")
