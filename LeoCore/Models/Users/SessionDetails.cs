namespace LeoCore.Models.Users;

public sealed record SessionDetails(DateTime ExpiresAt, string? Device = null);
public sealed record SessionInfo(
    long Id, long UserId, string? Device, DateTime ExpiresAt, DateTime? RevokedAt,
    DateTime CreatedAt, DateTime UpdatedAt);
public sealed record CreatedSession(SessionInfo Session, string RefreshToken);
