using LeoDatabase.Models.Localization;

namespace LeoDatabase.Models.Workout;

public class ExerciseMediaTranslation
{
    public long ExerciseMediaId { get; set; }
    public long LanguageId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? AltText { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ExerciseMedia ExerciseMedia { get; set; } = null!;
    public Language Language { get; set; } = null!;
}
