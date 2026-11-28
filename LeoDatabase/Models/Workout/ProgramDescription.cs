using LeoDatabase.Models.Localization;
namespace LeoDatabase.Models.Workout;
public class ProgramDescription
{
    public long ProgramId { get; set; }
    public long LanguageId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string ImageAlt { get; set; } = string.Empty;
    public Program Program { get; set; } = null!;
    public Language Language { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
