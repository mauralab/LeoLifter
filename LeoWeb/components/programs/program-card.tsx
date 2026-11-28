import Image from "next/image"
import Link from "next/link"
import { ImageIcon, Layers3, ArrowUpRight } from "lucide-react"
import type { ProgramSummary } from "@/lib/programs/validation"
import type { Messages } from "@/lib/i18n"
export function ProgramCard({
  program,
  copy,
  href,
}: {
  program: ProgramSummary
  copy: Messages["programs"]
  href: string
}) {
  return (
    <Link prefetch={false} className="exercise-card program-card" href={href}>
      <div className="exercise-image-placeholder">
        <span className="exercise-muscle">{copy.tab}</span>
        {program.imageUrl ? (
          <Image
            src={program.imageUrl}
            alt={program.imageAlt || program.name}
            width={720}
            height={450}
            unoptimized
          />
        ) : (
          <div className="exercise-image-label">
            <ImageIcon size={30} strokeWidth={1.1} aria-hidden="true" />
            <span>{copy.descriptionCover}</span>
          </div>
        )}
      </div>
      <div className="exercise-card-content">
        <h2>{program.name}</h2>
        <p>{program.description || "—"}</p>
        <div className="exercise-card-footer">
          <Layers3 size={15} />
          <span>{copy.tab}</span>
          <ArrowUpRight size={16} />
        </div>
      </div>
    </Link>
  )
}
