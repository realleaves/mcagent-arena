import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
const screenshots = process.env.ARENA_SCREENSHOT_DIR || 'docs/screenshots';
const base = process.env.ARENA_WEB_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/microsoft-edge') ? '/usr/bin/microsoft-edge' : undefined),
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1040 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
mkdirSync(screenshots, { recursive: true });
try {
  await page.goto(base + '/');
  await page.getByRole('link', { name: '体验麦麦 Demo', exact: true }).waitFor();
  await page.locator('.stat strong').first().filter({ hasText: /^06/ }).waitFor();
  await page.screenshot({ path: `${screenshots}/dashboard.png`, fullPage: true });
  await page.locator('.scenario-card[href="/arena?scenario=scenario-004"]').click();
  await page
    .locator('.scenario-brief')
    .getByRole('heading', { name: '指定日期有哪些活动', exact: true })
    .waitFor();
  if ((await page.locator('.battle-controls select').nth(2).inputValue()) !== 'scenario-004')
    throw new Error('Business scenario shortcut did not select campaign task');
  await page.getByRole('button', { name: '开始对比', exact: true }).click();
  await page.getByText('包含了日期不符或已取消的活动', { exact: true }).waitFor({ timeout: 15000 });
  await page.goto(base + '/');
  await page.getByRole('link', { name: '体验麦麦 Demo', exact: true }).click();
  await page.getByRole('button', { name: '开始对比', exact: true }).waitFor();
  await page.getByRole('button', { name: '开始对比', exact: true }).click();
  await page.getByRole('link', { name: '查看完整工具轨迹' }).waitFor({ timeout: 15000 });
  await page.getByRole('heading', { name: '这次对比发现了什么？' }).waitFor();
  await page.getByText('餐品热量筛选或数值与工具数据不一致', { exact: true }).waitFor();
  await page.screenshot({ path: `${screenshots}/arena.png`, fullPage: true });
  const id = page.url().split('/').at(-1);
  await page.getByRole('link', { name: '查看完整工具轨迹' }).click();
  await page.getByRole('tab', { name: /All events/ }).waitFor();
  await page.screenshot({ path: `${screenshots}/traces.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Agent A', exact: true }).click();
  if (!(await page.getByRole('tabpanel').getByText('tool_result', { exact: false }).count()))
    throw new Error('Agent A trace absent');
  await page.goto(base + '/results');
  await page
    .locator('a[href="/arena/' + id + '"]')
    .first()
    .waitFor();
  await page.screenshot({ path: `${screenshots}/results.png`, fullPage: true });
  await page.goto(`${base}/arena/${id}`);
  await page.getByRole('link', { name: '查看完整工具轨迹' }).waitFor();
  await page.reload();
  await page.getByRole('link', { name: '查看完整工具轨迹' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshots}/mobile-arena.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.goto(base + '/');
  await page.getByRole('link', { name: '体验麦麦 Demo', exact: true }).waitFor();
  await page.screenshot({ path: `${screenshots}/mobile-dashboard.png`, fullPage: true });
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(
    JSON.stringify({
      battleId: id,
      errors,
      mobileOverflow: overflow || homeOverflow,
      checks: [
        'Demo UI battle',
        'business scenario shortcut',
        'Chinese failure explanations',
        'real-time trace',
        'trace filter',
        'results history',
        'reload recovery',
        'mobile viewport',
      ],
    }),
  );
  if (errors.length || overflow || homeOverflow) process.exitCode = 1;
} finally {
  await browser.close();
}
