using LeoDatabase.Models.Telegram;
using Microsoft.EntityFrameworkCore;
namespace LeoDatabase.Context.Configurations;

internal static class TelegramUserPreferenceConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<TelegramUserPreference>(e =>
        {
            e.ToTable("telegram_user_preferences", t => t.HasCheckConstraint("telegram_user_preferences_telegram_id_check", "telegram_id > 0"));
            e.HasKey(x => x.TelegramId);
            e.Property(x => x.TelegramId).ValueGeneratedNever();
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.LanguageId).HasDatabaseName("ix_telegram_user_preferences_language_id");
        });
    }
}
