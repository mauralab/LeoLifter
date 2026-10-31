using LeoDatabase.Models.Personal;

namespace LeoCore.Models.Personal;

/// <summary>A complete measurement; timestamps must be UTC.</summary>
public sealed record WeightMeasurementDetails
{
    public required decimal Weight { get; init; }
    public required WeightUnit WeightUnit { get; init; }
    public DateTime MeasuredAt { get; init; } = DateTime.UtcNow;
}
