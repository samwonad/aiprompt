import { analyzeRequest } from '../src/domain/analyzer'

const cases = [
  {
    request: '표지 디자인에 쓸 농업 소스. 농부, 채소밭, 농기계, 채소바구니',
    expectedTopRecipe: 'cover-source-cluster',
  },
  {
    request: '어린이 체험농장용 귀여운 딸기 캐릭터',
    expectedTopRecipe: 'mascot-main',
  },
  {
    request: '현수막에 크게 넣을 사과 농장 오브젝트',
    expectedTopRecipe: 'signage-bold',
  },
  {
    request: '아이콘 세트. 채소, 트럭, 농부, 바구니',
    expectedTopRecipe: 'icon-set',
  },
]

for (const item of cases) {
  const result = analyzeRequest({
    request: item.request,
    manualUseCase: 'auto',
    manualTone: 'auto',
  })
  const top = result.suggestions[0]?.id
  if (top !== item.expectedTopRecipe) {
    throw new Error(`Expected ${item.expectedTopRecipe}, got ${top} for: ${item.request}`)
  }
}

console.log('Analyzer case test passed')
