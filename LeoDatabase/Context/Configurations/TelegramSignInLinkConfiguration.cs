using LeoDatabase.Models.Telegram;
using Microsoft.EntityFrameworkCore;
namespace LeoDatabase.Context.Configurations;

internal static class TelegramSignInLinkConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<TelegramSignInLink>(e =>
        {
            e.ToTable("telegram_signin_links", t =>
            {
                t.HasCheckConstraint("telegram_signin_links_code_hash_check", "code_hash ~ '^[A-F0-9]{64}$'");
                t.HasCheckConstraint("telegram_signin_links_telegram_id_check", "telegram_id > 0");
                t.HasCheckConstraint("telegram_signin_links_chat_id_check", "chat_id = telegram_id");
                t.HasCheckConstraint("telegram_signin_links_telegram_username_check", "telegram_username ~ '^[A-Za-z0-9_]{0,32}$'");
                t.HasCheckConstraint("telegram_signin_links_locale_check", "locale IN ('en', 'uk', 'nb', 'de', 'pl')");
                t.HasCheckConstraint("telegram_signin_links_check", "expires_at > created_at");
            });
            e.HasKey(x => x.CodeHash);
            e.Property(x => x.TelegramUsername).HasMaxLength(32).HasDefaultValue("");
            e.Property(x => x.Locale).HasMaxLength(2).IsRequired();
            e.Property(x => x.CodeHash).IsRequired();
            e.HasIndex(x => x.ExpiresAt).HasDatabaseName("ix_telegram_signin_links_expires_at");
        });
    }
}
