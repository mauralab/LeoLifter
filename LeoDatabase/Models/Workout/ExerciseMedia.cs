namespace LeoDatabase.Models.Workout;

public class ExerciseMedia
{
    public long Id { get; set; }
    public long ExerciseId { get; set; }
    public ExerciseMediaType Type { get; set; }
    public int Position { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Exercise Exercise { get; set; } = null!;
    public ICollection<ExerciseMediaTranslation> Translations { get; set; } = new List<ExerciseMediaTranslation>();
}
