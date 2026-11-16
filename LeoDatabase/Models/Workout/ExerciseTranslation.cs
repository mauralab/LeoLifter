using LeoDatabase.Models.Localization;

namespace LeoDatabase.Models.Workout;

public class ExerciseTranslation
{
    public long ExerciseId { get; set; }
    public long LanguageId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Exercise Exercise { get; set; } = null!;
    public Language Language { get; set; } = null!;
}
