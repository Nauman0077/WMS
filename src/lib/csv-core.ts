import { promises as fs } from "node:fs"
import path from "node:path"

const fileLocks = new Map<string, Promise<void>>()

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      fields.push(current)
      current = ""
      continue
    }

    current += char
  }

  fields.push(current)
  return fields
}

function parseCsvContent(content: string): string[][] {
  if (!content.trim()) {
    return []
  }

  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const rows: string[][] = []
  let current = ""
  let quoteCount = 0

  for (const line of lines) {
    if (current.length > 0) {
      current += "\n"
    }
    current += line
    quoteCount += (line.match(/"/g) ?? []).length

    if (quoteCount % 2 === 0) {
      rows.push(parseCsvLine(current))
      current = ""
      quoteCount = 0
    }
  }

  if (current.length > 0) {
    rows.push(parseCsvLine(current))
  }

  return rows
}

async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = fileLocks.get(filePath) ?? Promise.resolve()
  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })

  fileLocks.set(filePath, previous.then(() => next))
  await previous

  try {
    return await fn()
  } finally {
    release()
    if (fileLocks.get(filePath) === next) {
      fileLocks.delete(filePath)
    }
  }
}

export async function ensureCsvFile(filePath: string, headers: string[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  try {
    await fs.access(filePath)
  } catch {
    await fs.writeFile(filePath, `${headers.join(",")}\n`, "utf8")
    return
  }

  const content = await fs.readFile(filePath, "utf8")
  const rows = parseCsvContent(content)
  if (rows.length === 0) {
    await fs.writeFile(filePath, `${headers.join(",")}\n`, "utf8")
    return
  }

  const currentHeaders = rows[0]
  const sameShape =
    currentHeaders.length === headers.length &&
    headers.every((header, index) => currentHeaders[index] === header)

  if (!sameShape) {
    const dataRows = rows.slice(1)
    const mappedRows = dataRows.map((row) => {
      const rowObj: Record<string, string> = {}
      currentHeaders.forEach((header, index) => {
        rowObj[header] = row[index] ?? ""
      })
      return headers.map((header) => rowObj[header] ?? "")
    })
    const nextContent = [headers, ...mappedRows]
      .map((line) => line.map((value) => escapeCsv(value)).join(","))
      .join("\n")
    await fs.writeFile(filePath, `${nextContent}\n`, "utf8")
  }
}

export async function readCsvRows(filePath: string, headers: string[]): Promise<Record<string, string>[]> {
  await ensureCsvFile(filePath, headers)
  const content = await fs.readFile(filePath, "utf8")
  const rows = parseCsvContent(content)

  if (rows.length <= 1) {
    return []
  }

  return rows.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const output: Record<string, string> = {}
    headers.forEach((header, index) => {
      output[header] = row[index] ?? ""
    })
    return output
  })
}

export async function writeCsvRows(
  filePath: string,
  headers: string[],
  rows: Record<string, string>[],
): Promise<void> {
  await withFileLock(filePath, async () => {
    await ensureCsvFile(filePath, headers)
    const contentLines = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
    ]
    const tempPath = `${filePath}.tmp`
    await fs.writeFile(tempPath, `${contentLines.join("\n")}\n`, "utf8")
    await fs.rename(tempPath, filePath)
  })
}

export async function appendCsvRow(
  filePath: string,
  headers: string[],
  row: Record<string, string>,
): Promise<void> {
  const existing = await readCsvRows(filePath, headers)
  existing.push(row)
  await writeCsvRows(filePath, headers, existing)
}

export function toBool(value: string): boolean {
  return value.trim().toLowerCase() === "true"
}

export function fromBool(value: boolean): string {
  return value ? "true" : "false"
}

export function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function fromNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "0"
}
