using LeoDatabase.Models.Personal;

namespace LeoCore.Models.Personal;

/// <summary>The complete editable profile. Null clears an optional field when editing.</summary>
public sealed record ProfileDetails
{
    public string? Sex { get; init; }
    public DateOnly? BirthDate { get; init; }
    public decimal? Height { get; init; }
    public LengthUnit? HeightUnit { get; init; }
    public string? Country { get; init; }
    public string? City { get; init; }
    public string? Timezone { get; init; }
}
