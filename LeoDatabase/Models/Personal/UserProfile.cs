#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Users;

namespace LeoDatabase.Models.Personal;

public class UserProfile
{
    public long UserId { get; set; }
    public string? Sex { get; set; }
    public DateOnly? BirthDate { get; set; }
    public decimal? Height { get; set; }
    public LengthUnit? HeightUnit { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Timezone { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}
