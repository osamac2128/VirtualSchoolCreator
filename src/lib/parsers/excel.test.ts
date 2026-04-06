import { describe, it, expect } from 'vitest'
import { parseAtlasExcel, AtlasRowSchema } from './excel'
import ExcelJS from 'exceljs'

// Helper: build an in-memory .xlsx buffer using ExcelJS
async function buildXlsxBuffer(
  rows: (string | number | undefined)[][],
  sheetName = 'Atlas Data'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  for (const row of rows) {
    sheet.addRow(row)
  }
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer
}

describe('parseAtlasExcel', () => {
  it('parses a valid Atlas Excel file', async () => {
    const buf = await buildXlsxBuffer([
      ['Unit', 'Duration', 'Objectives', 'Standards', 'Resources'],
      ['Unit 1: Intro', '4 weeks', 'Learn basics', 'ELA.11.RL.1', 'Textbook'],
    ])

    const result = await parseAtlasExcel(buf)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      unitName: 'Unit 1: Intro',
      unitDuration: '4 weeks',
      objectives: 'Learn basics',
      aeroStandards: 'ELA.11.RL.1',
      resources: 'Textbook',
    })
  })

  it('skips the header row and returns empty for header-only files', async () => {
    const buf = await buildXlsxBuffer([
      ['Unit', 'Duration', 'Objectives', 'Standards', 'Resources'],
    ])
    const result = await parseAtlasExcel(buf)
    expect(result).toHaveLength(0)
  })

  it('parses multiple data rows', async () => {
    const buf = await buildXlsxBuffer([
      ['Unit', 'Duration', 'Objectives', 'Standards', 'Resources'],
      ['Unit 1', '2 weeks', 'Obj A', 'STD.1', 'Book A'],
      ['Unit 2', '3 weeks', 'Obj B', 'STD.2', 'Book B'],
      ['Unit 3', '1 week', 'Obj C', 'STD.3', 'Book C'],
    ])

    const result = await parseAtlasExcel(buf)
    expect(result).toHaveLength(3)
    expect(result[2].unitName).toBe('Unit 3')
  })

  it('throws when there are no worksheets in the file', async () => {
    const workbook = new ExcelJS.Workbook()
    const buf = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    await expect(parseAtlasExcel(buf)).rejects.toThrow('No worksheets found')
  })

  it('reads only the first worksheet', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet1 = workbook.addWorksheet('Sheet1')
    sheet1.addRow(['Unit', 'Duration', 'Objectives', 'Standards', 'Resources'])
    sheet1.addRow(['Unit A', '1 week', 'Obj A', 'STD.A', 'Res A'])
    const sheet2 = workbook.addWorksheet('Sheet2')
    sheet2.addRow(['Unit', 'Duration', 'Objectives', 'Standards', 'Resources'])
    sheet2.addRow(['Unit B', '2 weeks', 'Obj B', 'STD.B', 'Res B'])

    const buf = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    const result = await parseAtlasExcel(buf)

    expect(result).toHaveLength(1)
    expect(result[0].unitName).toBe('Unit A')
  })
})

describe('AtlasRowSchema', () => {
  it('accepts a fully populated row', () => {
    const result = AtlasRowSchema.safeParse({
      unitName: 'Test Unit',
      unitDuration: '4 weeks',
      objectives: 'Some goal',
      aeroStandards: 'ELA.11.RL.1',
      resources: 'Book',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a row with all optional fields omitted', () => {
    const result = AtlasRowSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects non-string values for string fields', () => {
    const result = AtlasRowSchema.safeParse({ unitName: 123 })
    expect(result.success).toBe(false)
  })
})