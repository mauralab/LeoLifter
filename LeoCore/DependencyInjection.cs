using LeoCore.Managers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.AspNetCore.Identity;
using LeoDatabase.Models.Users;

namespace LeoCore;

public static class DependencyInjection
{
    public static IServiceCollection AddLeoCore(this IServiceCollection services)
    {
        services.AddScoped<UserManager>();
        services.TryAddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<AccessManager>();
        services.AddScoped<ProgramManager>();
        services.AddScoped<WorkoutManager>();
        return services;
    }
}
