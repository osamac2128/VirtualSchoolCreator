import ExcelJS from 'exceljs'
import { z } from 'zod'

// Rough schema based on typical Atlas format expectations
export const AtlasRowSchema = z.object({
  unitName: z.string().optional(),
  unitDuration: z.string().optional(),
  objectives: z.string().optional(),
  aeroStandards: z.string().optional(),
  resources: z.string().optional(),
})

export type ParsedAtlasRow = z.infer<typeof AtlasRowSchema>

export async function parseAtlasExcel(buffer: Buffer): Promise<ParsedAtlasRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  
  const worksheet = workbook.worksheets[0] // Assuming data is on first sheet
  if (!worksheet) throw new Error('No worksheets found in the Excel file.')

  const data: ParsedAtlasRow[] = []
  
  // Basic heuristic iteration (assumes headers on row 1)
  // Real Atlas files are highly nested, requiring complex cell merging parsing
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // Skip header
    
    // Atlas specific parsing logic goes here, mapped to columns
    // We assume columns: A=Unit, B=Duration, C=Objectives, D=Standards, E=Resources
    const rowData = {
      unitName: row.getCell(1).text,
      unitDuration: row.getCell(2).text,
      objectives: row.getCell(3).text,
      aeroStandards: row.getCell(4).text,
      resources: row.getCell(5).text,
    }
    
    const parsed = AtlasRowSchema.safeParse(rowData)
    if (parsed.success) {
      data.push(parsed.data)
    }
  })

  return data
}
