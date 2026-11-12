import { describe, expect, it } from 'vitest'
import { replisMarkdown } from '../src/shared/replis-markdown'

const lignes = (t: string): string[] => t.split('\n')

describe('replisMarkdown', () => {
  it('replie chaque titre jusqu’au titre suivant de même niveau ou plus haut', () => {
    const t = lignes('# A\ntexte\n## B\nb\n## C\nc\n\n# D\nd')
    expect(replisMarkdown(t)).toEqual([
      { debut: 1, fin: 6 },
      { debut: 3, fin: 4 },
      { debut: 5, fin: 6 },
      { debut: 8, fin: 9 }
    ])
  })

  it('ignore les lignes vides avant le titre suivant et les titres sans contenu', () => {
    expect(replisMarkdown(lignes('# A\n\n# B\nb\n\n\n'))).toEqual([{ debut: 3, fin: 4 }])
  })

  it('ne prend pas un # dans un bloc de code pour un titre', () => {
    const t = lignes('# A\n```sh\n# commentaire\n```\nfin')
    expect(replisMarkdown(t)).toEqual([{ debut: 1, fin: 5 }])
  })

  it('demande une espace après les #, et au plus six', () => {
    expect(replisMarkdown(lignes('#pas un titre\nx\n####### non plus\ny'))).toEqual([])
  })
})
