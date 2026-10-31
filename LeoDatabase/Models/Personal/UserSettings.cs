#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;

namespace LeoDatabase.Models.Personal;

public class UserSettings
{
    public long UserId { get; set; }
    public string Language { get; set; } = "en";
    public WeightUnit WeightMeasureUnit { get; set; } = WeightUnit.Kg;
    public LengthUnit LengthMeasureUnit { get; set; } = LengthUnit.Cm;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}
