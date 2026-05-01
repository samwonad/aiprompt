import { chromium } from 'playwright'

const url = process.env.APP_URL || 'http://localhost:5173/'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })

try {
  await page.goto(url, { waitUntil: 'networkidle' })

  await expectText('Samwon Design Generator')
  await page.getByRole('button', { name: '예시 입력' }).click()
  await page.getByRole('button', { name: '방향 추천' }).click()

  await expectText('표지에 넣기 좋은 대표 소스')
  await expectText('여러 내용을 한눈에 정리한 설명형 소스')

  await page.getByRole('button', { name: '생성 요청' }).click()
  await expectText('생성 요청 기록 준비 완료')

  await page.getByLabel('참조 이미지 업로드').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expectText('1x1')

  await page.getByLabel('짧은 메모').fill('테스트 메모: 표지 소스가 아니라 풍경처럼 보임')
  await page.getByRole('button', { name: '너무 복잡함' }).click()

  await expectText('레시피별 개선 우선순위')
  await expectText('너무 복잡함 1건')
  await expectText('테스트 메모: 표지 소스가 아니라 풍경처럼 보임')
  await expectText('참조 이미지 1장')

  console.log('E2E smoke test passed')
} finally {
  await browser.close()
}

async function expectText(text) {
  await page.getByText(text, { exact: false }).waitFor({ state: 'visible', timeout: 5000 })
}
