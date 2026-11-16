export type ExerciseData = {
  id?: string
  name: string
  description: string
  type: "repetitions" | "distance" | "duration"
  includesOwnWeight: boolean
  includesAdditionalWeight: boolean
  translations: { languageId: string; title: string; description: string }[]
  media: {
    type: "image" | "video"
    translations: {
      languageId: string
      url: string
      title: string
      description: string
      altText: string
    }[]
  }[]
}
export type Language = { id: string; code: string; nativeName: string }
