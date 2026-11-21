import type { Messages } from "@/lib/i18n"
import {
  setCount,
  setMinimum,
  setCountLabel,
  type CanvasBlock,
  type ExerciseOption,
} from "./canvas-layout"
export type ProgramDraft = {
  name: string
  blocks: CanvasBlock[]
  catalog: ExerciseOption[]
  copy: Messages["programs"]
  exportedAt?: string
}
export function exportRows({ blocks, catalog, copy: t }: ProgramDraft) {
  const rows: {
    block: CanvasBlock
    depth: number
    title: string
    position: number
  }[] = []
  function visit(block: CanvasBlock, depth: number) {
    const siblings = blocks.filter(
      (b) => b.parentId === block.parentId && b.kind === block.kind
    )
    const position = siblings.findIndex((b) => b.id === block.id) + 1
    const title =
      block.kind === "exercise"
        ? catalog.find((e) => e.id === block.exerciseId)?.name ||
          block.name ||
          t.chooseExercise
        : block.name || `${t[block.kind]} ${position}`
    rows.push({ block, depth, title, position })
    const children = blocks.filter((b) => b.parentId === block.id)
    if (block.kind === "cycle") {
      children
        .filter((b) => b.kind === "day")
        .forEach((b) => visit(b, depth + 1))
      children
        .filter((b) => b.kind === "cycle")
        .forEach((b) => visit(b, depth + 1))
    } else children.forEach((b) => visit(b, depth + 1))
  }
  blocks
    .filter((b) => b.kind === "cycle" && !b.parentId)
    .forEach((b) => visit(b, 0))
  return rows
}
export function fileBase(value: string) {
  const result = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100)
    .replace(/\.(txt|xlsx)$/i, "")
  return !result || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(result)
    ? "LeoLifter-program"
    : result
}
export function exportText(draft: ProgramDraft) {
  const t = draft.copy,
    lines = [
      draft.name.trim() || t.untitled,
      `${t.exportedAt}: ${draft.exportedAt || new Date().toISOString()}`,
      "",
    ]
  for (const { block: b, depth, title, position } of exportRows(draft)) {
    const indent = "  ".repeat(depth)
    lines.push(
      `${indent}${t[b.kind]} ${position}: ${title}${b.kind === "set" ? ` ×${setCountLabel(b)}` : ["cycle", "group"].includes(b.kind) ? ` ×${b.repeatCount ?? 1}` : ""}`
    )
    if (b.description)
      lines.push(
        ...b.description
          .split(/\r?\n/)
          .map((line) => `${indent}  ${t.description}: ${line}`)
      )
    if (b.kind === "set")
      for (const [label, value] of [
        [t.repsMin, b.targetRepsMin],
        [t.repsMax, b.targetRepsMax],
        [t.valueMin, b.valueMin],
        [t.valueMax, b.valueMax],
        [t.unit, b.valueUnit],
      ])
        if (value !== undefined && value !== "")
          lines.push(`${indent}  ${label}: ${value}`)
  }
  // Retain every draft field alongside the readable outline for future tooling.
  lines.push(
    "",
    `--- ${t.exportData} ---`,
    JSON.stringify(
      {
        format: "leolifter-program",
        version: 1,
        name: draft.name,
        blocks: draft.blocks,
      },
      null,
      2
    )
  )
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}
export async function exportExcel(draft: ProgramDraft) {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "LeoLifter"
  workbook.created = new Date()
  const t = draft.copy,
    rows = exportRows(draft)
  const sheet = workbook.addWorksheet(t.exportPlan, {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  })
  sheet.columns = [
    { width: 14 },
    { width: 34 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 55 },
  ]
  sheet.mergeCells("A1:J1")
  sheet.getCell("A1").value = draft.name.trim() || t.untitled
  sheet.getCell("A1").font = {
    name: "Calibri",
    size: 20,
    bold: true,
    color: { argb: "FF27313A" },
  }
  sheet.getRow(1).height = 34
  sheet.mergeCells("A2:J2")
  sheet.getCell("A2").value =
    `${t.exportedAt}: ${draft.exportedAt || new Date().toISOString()}`
  sheet.getCell("A2").font = {
    name: "Calibri",
    size: 10,
    color: { argb: "FF697586" },
  }
  const headers = [
    t.exportKind,
    t.objectTitle,
    t.repeatCount,
    t.exportSetCount,
    t.repsMin,
    t.repsMax,
    t.valueMin,
    t.valueMax,
    t.unit,
    t.description,
  ]
  sheet.getRow(4).values = headers
  const numeric = (value?: string) =>
    value !== undefined && value !== "" && /^\d{1,9}(\.\d{1,3})?$/.test(value)
      ? Number(value)
      : value || ""
  for (const { block: b, depth, title } of rows) {
    const row = sheet.addRow([
      t[b.kind],
      title,
      ["cycle", "group"].includes(b.kind) ? (b.repeatCount ?? 1) : "",
      b.kind === "set"
        ? setMinimum(b) === setCount(b)
          ? setCount(b)
          : setCountLabel(b)
        : "",
      numeric(b.targetRepsMin),
      numeric(b.targetRepsMax),
      numeric(b.valueMin),
      numeric(b.valueMax),
      b.valueUnit || "",
      b.description || "",
    ])
    const titleLines = Math.ceil(title.length / Math.max(10, 34 - depth * 3))
    const descriptionLines = (b.description || "")
      .split(/\r?\n/)
      .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 55)), 0)
    row.height = Math.min(
      300,
      Math.max(28, Math.max(titleLines, descriptionLines) * 15)
    )
    row.outlineLevel = Math.min(depth, 7)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF27313A" } }
      cell.alignment = { vertical: "top", wrapText: true }
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
    })
    row.getCell(2).alignment = {
      vertical: "top",
      wrapText: true,
      indent: Math.min(depth, 10),
    }
    if (b.kind !== "set") {
      row.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FF27313A" },
      }
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb:
            b.kind === "cycle"
              ? "FFFFF2CC"
              : b.kind === "day"
                ? "FFEAF2F8"
                : "FFF2F5F8",
        },
      }
    }
    for (let c = 3; c <= 6; c++) row.getCell(c).numFmt = "0"
    for (let c = 7; c <= 8; c++) row.getCell(c).numFmt = "0.###"
  }
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(4, sheet.rowCount), column: 10 },
  }
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }
  sheet.pageSetup.printTitlesRow = "1:4"
  const data = workbook.addWorksheet(t.exportData, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  })
  const fields = [
    "id",
    "parentId",
    "position",
    "kind",
    "name",
    "exerciseId",
    "setCount",
    "setCountMin",
    "repeatCount",
    "description",
    "x",
    "y",
    "targetRepsMin",
    "targetRepsMax",
    "valueMin",
    "valueMax",
    "valueUnit",
  ]
  data.columns = fields.map((field) => ({
    header: field,
    key: field,
    width:
      field === "description"
        ? 55
        : field === "id" || field === "parentId"
          ? 39
          : field === "name"
            ? 32
            : 18,
  }))
  for (const { block, position } of rows)
    data.addRow({
      ...block,
      position,
      setCount: block.kind === "set" ? setCount(block) : "",
      setCountMin: block.kind === "set" ? setMinimum(block) : "",
      parentId: block.parentId || "",
    })
  data.eachRow((row, index) => {
    if (index > 1) {
      row.height = 30
      row.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 11 }
        cell.alignment = { vertical: "top", wrapText: true }
      })
    }
  })
  data.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, data.rowCount), column: fields.length },
  }
  for (const row of [sheet.getRow(4), data.getRow(1)]) {
    row.height = 32
    row.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FF27313A" },
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD966" },
      }
      cell.alignment = { vertical: "middle", wrapText: true }
    })
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}
