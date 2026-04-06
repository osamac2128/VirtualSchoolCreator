import { describe, it, expect } from 'vitest'
import { parseOneRoster } from './csv'

describe('parseOneRoster', () => {
  it('parses valid OneRoster CSV data and maps to ParsedAtlasRow', async () => {
    const csvContent = [
      'Unit,Duration,Objectives,Standards,Resources',
      'Unit 1,4 weeks,Learn basics,ELA.11.RL.1,Textbook',
      'Unit 2,3 weeks,Intermediate,ELA.11.RL.2,Online',
    ].join('\n')

    const result = await parseOneRoster(Buffer.from(csvContent, 'utf-8'))

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      unitName: 'Unit 1',
      unitDuration: '4 weeks',
      objectives: 'Learn basics',
      aeroStandards: 'ELA.11.RL.1',
      resources: 'Textbook',
    })
    expect(result[1].unitName).toBe('Unit 2')
  })

  it('falls back to alternate headers when standard headers are missing', async () => {
    const csvContent = [
      'Title,Time,Learning Outcomes,Tags,Materials',
      'Course Title,2 hours,Goal 1,Tag A,PDF',
    ].join('\n')

    const result = await parseOneRoster(Buffer.from(csvContent, 'utf-8'))

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      unitName: 'Course Title',
      unitDuration: '2 hours',
      objectives: 'Goal 1',
      aeroStandards: 'Tag A',
      resources: 'PDF',
    })
  })

  it('returns empty array when only a header row is present', async () => {
    const csvContent = 'Unit,Duration,Objectives,Standards,Resources'
    const result = await parseOneRoster(Buffer.from(csvContent, 'utf-8'))
    expect(result).toHaveLength(0)
  })

  it('produces undefined fields when columns are missing from a row', async () => {
    // Row has no Standards or Resources columns
    const csvContent = ['Unit,Duration,Objectives', 'Unit 1,4 weeks,Learn basics'].join('\n')

    const result = await parseOneRoster(Buffer.from(csvContent, 'utf-8'))
    expect(result).toHaveLength(1)
    expect(result[0].unitName).toBe('Unit 1')
    expect(result[0].aeroStandards).toBeUndefined()
    expect(result[0].resources).toBeUndefined()
  })

  it('handles multiple rows correctly', async () => {
    const rows = ['Unit,Duration,Objectives,Standards,Resources']
    for (let i = 1; i <= 5; i++) {
      rows.push(`Unit ${i},${i} weeks,Obj ${i},STD.${i},Res ${i}`)
    }
    const result = await parseOneRoster(Buffer.from(rows.join('\n'), 'utf-8'))
    expect(result).toHaveLength(5)
    expect(result[4].unitName).toBe('Unit 5')
  })

  it('throws when given an empty buffer with no sheet', async () => {
    // An empty buffer cannot produce any sheet names
    await expect(parseOneRoster(Buffer.from('', 'utf-8'))).rejects.toThrow()
  })
})
