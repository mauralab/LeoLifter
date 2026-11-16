using LeoDatabase.Models.Workout;

namespace LeoDatabase.Models.Localization;

public class Language
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public ICollection<ExerciseTranslation> ExerciseTranslations { get; set; } = new List<ExerciseTranslation>();
    public ICollection<ExerciseMediaTranslation> ExerciseMediaTranslations { get; set; } = new List<ExerciseMediaTranslation>();
}
