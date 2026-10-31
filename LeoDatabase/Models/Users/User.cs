#nullable enable

using System;
using System.Collections.Generic;
using LeoDatabase.Models.Access;
using LeoDatabase.Models.Personal;

namespace LeoDatabase.Models.Users;

public class User
{
    public long Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public UserTelegram? Telegram { get; set; }
    public UserPassword? Password { get; set; }
    public UserProfile? Profile { get; set; }
    public UserSettings? Settings { get; set; }
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
    public ICollection<UserPermission> Permissions { get; set; } = new List<UserPermission>();
    public ICollection<WeightMeasurement> WeightMeasurements { get; set; } = new List<WeightMeasurement>();
    public ICollection<LeoDatabase.Models.Workout.Program> AuthoredPrograms { get; set; } = new List<LeoDatabase.Models.Workout.Program>();
    public ICollection<LeoDatabase.Models.Workout.Workout> Workouts { get; set; } = new List<LeoDatabase.Models.Workout.Workout>();
}
