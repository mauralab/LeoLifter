"use client"
import { useState } from "react"
import type { Messages } from "@/lib/i18n"
import {
  targetError,
  setCount,
  setMinimum,
  sameTargets,
  targetFields,
  type CanvasBlock,
} from "./canvas-layout"
export function TargetFields({
  value,
  onChange,
  copy: t,
  prefix,
}: {
  value: Partial<CanvasBlock>
  onChange: (update: Partial<CanvasBlock>) => void
  copy: Messages["programs"]
  prefix: string
}) {
  const [repsRange, setRepsRange] = useState(
    !!value.targetRepsMin && value.targetRepsMin !== value.targetRepsMax
  )
  return (
    <>
      <label htmlFor={`${prefix}-reps-mode`}>{t.repsMode}</label>
      <select
        id={`${prefix}-reps-mode`}
        value={repsRange ? "range" : "single"}
        onChange={(e) => {
          const range = e.target.value === "range"
          setRepsRange(range)
          if (!range) {
            const reps = value.targetRepsMin || value.targetRepsMax || ""
            onChange({ targetRepsMin: reps, targetRepsMax: reps })
          }
        }}
      >
        <option value="single">{t.singleNumber}</option>
        <option value="range">{t.range}</option>
      </select>
      {!repsRange && (
        <>
          <label htmlFor={`${prefix}-reps`}>{t.repetitions}</label>
          <input
            id={`${prefix}-reps`}
            type="number"
            min={1}
            max={2147483647}
            step={1}
            value={value.targetRepsMin || ""}
            onChange={(e) =>
              onChange({
                targetRepsMin: e.target.value,
                targetRepsMax: e.target.value,
              })
            }
          />
        </>
      )}
      <div className="canvas-target-fields">
        {targetFields.slice(0, 4).map((field, i) =>
          i < 2 && !repsRange ? null : (
            <div key={field}>
              <label htmlFor={`${prefix}-${field}`}>
                {[t.repsMin, t.repsMax, t.valueMin, t.valueMax][i]}
              </label>
              <input
                id={`${prefix}-${field}`}
                type="number"
                min={i < 2 ? 1 : 0}
                max={i < 2 ? 2147483647 : 999999999.999}
                step={i < 2 ? 1 : 0.001}
                value={value[field] ?? ""}
                onChange={(e) => onChange({ [field]: e.target.value })}
              />
            </div>
          )
        )}
      </div>
      <label htmlFor={`${prefix}-unit`}>{t.unit}</label>
      <select
        id={`${prefix}-unit`}
        value={value.valueUnit || ""}
        onChange={(e) => onChange({ valueUnit: e.target.value })}
      >
        <option value="">{t.none}</option>
        {["kg", "lb", "percent_1rm", "km", "mi", "s"].map((u) => (
          <option key={u} value={u}>
            {u === "percent_1rm" ? "% 1RM" : u}
          </option>
        ))}
      </select>
      {targetError(value) && (
        <p className="canvas-inspector-error" role="alert">
          {targetError(value) === "reps" ? t.invalidReps : t.invalidValue}
        </p>
      )}
    </>
  )
}
export function IdenticalSets({
  sets,
  copy: t,
  onApply,
}: {
  sets: CanvasBlock[]
  copy: Messages["programs"]
  onApply: (
    amount: number,
    template: Partial<CanvasBlock>,
    minimum: number
  ) => void
}) {
  const [amount, setAmount] = useState(
    sets.reduce((n, s) => n + setCount(s), 0) || 3
  )
  const [minimum, setMinimumAmount] = useState(
    sets.length ? sets.reduce((n, s) => n + setMinimum(s), 0) : 3
  )
  const [template, setTemplate] = useState<Partial<CanvasBlock>>(() =>
    Object.fromEntries(targetFields.map((f) => [f, sets[0]?.[f] || ""]))
  )
  const valid =
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= 100 &&
    minimum >= 0 &&
    minimum <= amount &&
    !targetError(template)
  return (
    <section className="identical-sets">
      <h3>{t.identicalSets}</h3>
      <SetCountFields
        prefix="template-count"
        value={{ setCount: amount, setCountMin: minimum }}
        copy={t}
        onChange={(v) => {
          setAmount(v.setCount!)
          setMinimumAmount(v.setCountMin!)
        }}
      />
      <p className="canvas-inspector-note">{t.setAmountHint}</p>
      <TargetFields
        prefix="template"
        value={template}
        onChange={(update) => setTemplate((v) => ({ ...v, ...update }))}
        copy={t}
      />
      <button
        className="account-primary"
        type="button"
        disabled={!valid}
        onClick={() => {
          if (
            sets.some((s) => !sameTargets(s, template)) &&
            !window.confirm(t.replaceSets)
          )
            return
          onApply(amount, template, minimum)
        }}
      >
        {t.applySets}
      </button>
    </section>
  )
}

export function SetCountFields({
  value,
  onChange,
  copy: t,
  prefix,
}: {
  value: Partial<CanvasBlock>
  onChange: (v: Partial<CanvasBlock>) => void
  copy: Messages["programs"]
  prefix: string
}) {
  const min = setMinimum(value),
    max = setCount(value)
  const [range, setRange] = useState(min !== max)
  function update(raw: string, field: "min" | "max" | "single") {
    if (!/^\d+$/.test(raw)) return
    const n = Number(raw)
    if (!Number.isInteger(n) || n > 100 || n < (field === "min" ? 0 : 1)) return
    onChange({
      setCount: field === "min" ? max : n,
      setCountMin: field === "max" ? min : n,
    })
  }
  return (
    <>
      <label htmlFor={`${prefix}-mode`}>{t.setCountMode}</label>
      <select
        id={`${prefix}-mode`}
        value={range ? "range" : "single"}
        onChange={(e) => {
          const r = e.target.value === "range"
          setRange(r)
          if (!r) onChange({ setCount: max, setCountMin: max })
        }}
      >
        <option value="single">{t.singleNumber}</option>
        <option value="range">{t.range}</option>
      </select>
      {range ? (
        <div className="canvas-target-fields">
          <div>
            <label htmlFor={`${prefix}-min`}>{t.setsMin}</label>
            <input
              id={`${prefix}-min`}
              type="number"
              min={0}
              max={100}
              step={1}
              value={min}
              onChange={(e) => update(e.target.value, "min")}
            />
          </div>
          <div>
            <label htmlFor={`${prefix}-max`}>{t.setsMax}</label>
            <input
              id={`${prefix}-max`}
              type="number"
              min={1}
              max={100}
              step={1}
              value={max}
              onChange={(e) => update(e.target.value, "max")}
            />
          </div>
        </div>
      ) : (
        <>
          <label htmlFor={`${prefix}-single`}>{t.setAmount}</label>
          <input
            id={`${prefix}-single`}
            type="number"
            min={1}
            max={100}
            step={1}
            value={max}
            onChange={(e) => update(e.target.value, "single")}
          />
        </>
      )}
      {min > max && (
        <p role="alert" className="canvas-inspector-error">
          {t.invalidSetCount}
        </p>
      )}
    </>
  )
}
