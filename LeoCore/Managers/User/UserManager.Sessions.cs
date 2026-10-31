using System.Security.Cryptography;
using System.Text;
using LeoCore.Models.Users;
using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace LeoCore.Managers;

public sealed partial class UserManager
{
    /// <summary>Issues a random refresh token. Only its SHA-256 hash is stored.</summary>
    public async Task<CreatedSession> AddSessionAsync(
        long userId, SessionDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSession(details);
        await RequireUserAsync(userId, cancellationToken);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var session = new UserSession
        {
            UserId = userId, Device = Normalize(details.Device), ExpiresAt = details.ExpiresAt,
            RefreshTokenHash = HashToken(token)
        };
        database.UserSessions.Add(session);
        await database.SaveChangesAsync(cancellationToken);
        return new CreatedSession(ToSessionInfo(session), token);
    }

    public async Task<SessionInfo?> GetSessionAsync(
        long userId, long sessionId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sessionId);
        await RequireUserAsync(userId, cancellationToken);
        var session = await database.UserSessions.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == sessionId && x.UserId == userId, cancellationToken);
        return session is null ? null : ToSessionInfo(session);
    }

    public async Task<List<SessionInfo>> ListSessionsAsync(
        long userId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        ValidatePage(skip, take);
        await RequireUserAsync(userId, cancellationToken);
        var sessions = await database.UserSessions.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.Id).Skip(skip).Take(take).ToListAsync(cancellationToken);
        return sessions.Select(ToSessionInfo).ToList();
    }

    /// <summary>Updates session metadata and expiry without changing its token or revocation state.</summary>
    public async Task<SessionInfo> EditSessionAsync(
        long userId, long sessionId, SessionDetails details, CancellationToken cancellationToken = default)
    {
        ValidateSession(details);
        var session = await RequireSessionAsync(userId, sessionId, cancellationToken);
        if (session.RevokedAt is not null || session.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("An expired or revoked session cannot be extended; create a new session.");
        session.Device = Normalize(details.Device);
        session.ExpiresAt = details.ExpiresAt;
        await database.SaveChangesAsync(cancellationToken);
        return ToSessionInfo(session);
    }

    public async Task RevokeSessionAsync(long userId, long sessionId, CancellationToken cancellationToken = default)
    {
        var session = await RequireSessionAsync(userId, sessionId, cancellationToken);
        if (session.RevokedAt is not null) return;
        session.RevokedAt = DateTime.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteSessionAsync(long userId, long sessionId, CancellationToken cancellationToken = default)
    {
        var session = await RequireSessionAsync(userId, sessionId, cancellationToken);
        database.UserSessions.Remove(session);
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task<SessionInfo?> FindActiveSessionByTokenAsync(
        string refreshToken, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);
        var hash = HashToken(refreshToken);
        var now = DateTime.UtcNow;
        var session = await database.UserSessions.AsNoTracking().SingleOrDefaultAsync(
            x => x.RefreshTokenHash == hash && x.RevokedAt == null && x.ExpiresAt > now, cancellationToken);
        return session is null ? null : ToSessionInfo(session);
    }

    private async Task<UserSession> RequireSessionAsync(
        long userId, long sessionId, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sessionId);
        return await database.UserSessions.SingleOrDefaultAsync(
                   x => x.Id == sessionId && x.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Session was not found for this user.");
    }

    private async Task MarkSessionsRevokedAsync(long userId, CancellationToken cancellationToken)
    {
        var sessions = await database.UserSessions.Where(x => x.UserId == userId && x.RevokedAt == null)
            .ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var session in sessions) session.RevokedAt = now;
    }

    private static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static SessionInfo ToSessionInfo(UserSession session) => new(
        session.Id, session.UserId, session.Device, session.ExpiresAt, session.RevokedAt, session.CreatedAt, session.UpdatedAt);

    private static void ValidateSession(SessionDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);
        if (details.ExpiresAt.Kind != DateTimeKind.Utc || details.ExpiresAt <= DateTime.UtcNow)
            throw new ArgumentException("Session expiry must be a future UTC timestamp.", nameof(details));
    }
}
