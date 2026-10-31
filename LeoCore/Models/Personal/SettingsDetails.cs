using LeoDatabase.Models.Personal;

namespace LeoCore.Models.Personal;

public sealed record SettingsDetails
{
    public string Language { get; init; } = "en";
    public WeightUnit WeightMeasureUnit { get; init; } = WeightUnit.Kg;
    public LengthUnit LengthMeasureUnit { get; init; } = LengthUnit.Cm;
}
