import * as XLSX from 'xlsx'
import { ParsedAtlasRow } from './excel'

export async function parseOneRoster(buffer: Buffer): Promise<ParsedAtlasRow[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No worksheets found in the CSV/XLSX file.')
  
  // sheetName is sourced from XLSX internals (SheetNames[0]), never from user input.
  // The bracket lookups in the map below also use static string literals only.
  // eslint-disable-next-line security/detect-object-injection
  const worksheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(worksheet)

  // Mapping OneRoster format to our common intermediate schema (ParsedAtlasRow).
  const data: ParsedAtlasRow[] = (json as Record<string, string>[]).map((row) => ({
    unitName: row['Unit'] || row['Title'] || row['Name'],
    unitDuration: row['Duration'] || row['Time'],
    objectives: row['Objectives'] || row['Learning Outcomes'],
    aeroStandards: row['Standards'] || row['Tags'],
    resources: row['Resources'] || row['Materials'],
  }))

  return data
}
