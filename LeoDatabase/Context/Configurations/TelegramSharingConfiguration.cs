using LeoDatabase.Models.Telegram;
using LeoDatabase.Models.Users;
using Microsoft.EntityFrameworkCore;
namespace LeoDatabase.Context.Configurations;
internal static class TelegramSharingConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<TelegramConnectionNotification>(e=>
        {
            e.ToTable("telegram_connection_notifications",t=>t.HasCheckConstraint("telegram_connection_notifications_recipient_id_check","recipient_id>0"));
            e.HasKey(x=>new{x.ChatId,x.UpdateId});
            e.Property(x=>x.Title).IsRequired();e.Property(x=>x.Locale).HasMaxLength(2).HasDefaultValue("en").IsRequired();
            e.Property(x=>x.NextAttemptAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        model.Entity<TelegramChat>(e=>
        {
            e.ToTable("telegram_chats", t=> {
                t.HasCheckConstraint("telegram_chats_chat_id_check","chat_id<0");
                t.HasCheckConstraint("telegram_chats_chat_type_check","chat_type IN ('group','supergroup','channel')");
                t.HasCheckConstraint("telegram_chats_locale_check","locale IN ('en','uk','nb','de','pl')");
            });
            e.HasKey(x=>x.ChatId); e.Property(x=>x.ChatId).ValueGeneratedNever();
            e.Property(x=>x.Locale).HasMaxLength(2).HasDefaultValue("en");
            e.Property(x=>x.BotUsername).HasMaxLength(32);
            e.Property(x=>x.Title).IsRequired();e.Property(x=>x.ChatType).IsRequired();
        });
        model.Entity<TelegramChatManager>(e=>
        {
            e.ToTable("telegram_chat_managers");e.HasKey(x=>new{x.ChatId,x.TelegramId});
            e.HasOne<TelegramChat>().WithMany().HasForeignKey(x=>x.ChatId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x=>x.VerifiedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        model.Entity<TelegramWorkoutPreference>(e=>
        {
            e.ToTable("telegram_workout_preferences");e.HasKey(x=>x.UserId);
            e.Property(x=>x.PrivateEnabled).HasDefaultValue(true);
            e.HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<TelegramWorkoutSubscription>(e=>
        {
            e.ToTable("telegram_workout_subscriptions",t=> {
                t.HasCheckConstraint("telegram_workout_subscriptions_status_check","status IN ('pending','accepted','declined')");
                t.HasCheckConstraint("telegram_workout_subscriptions_check","NOT enabled OR status='accepted'");
            });
            e.HasKey(x=>new{x.ChatId,x.UserId});e.Property(x=>x.Status).HasDefaultValue("pending").IsRequired();
            e.HasOne<TelegramChat>().WithMany().HasForeignKey(x=>x.ChatId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>().WithMany().HasForeignKey(x=>x.InvitedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x=>x.UserId).HasDatabaseName("ix_telegram_workout_subscriptions_user");
        });
        model.Entity<WorkoutTelegramMessage>(e=>
        {
            e.ToTable("workout_telegram_messages");e.HasKey(x=>new{x.WorkoutId,x.ChatId});
            // Message records outlive deleted workouts until Telegram deletion completes.
            e.Property(x=>x.DeleteNextAttemptAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x=>x.NextAttemptAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x=>x.NextAttemptAt).HasDatabaseName("ix_workout_telegram_messages_pending").HasFilter("cancelled_at IS NULL AND desired_revision IS DISTINCT FROM delivered_revision");
        });
    }
}
