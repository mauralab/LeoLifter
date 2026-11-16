using LeoDatabase.Models.Localization;
using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;

namespace LeoDatabase.Context.Configurations;

internal static class ExerciseLocalizationConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<Language>(e =>
        {
            e.ToTable("languages", t =>
            {
                t.HasCheckConstraint("language_code_check", "code ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'");
                t.HasCheckConstraint("language_native_name_check", "native_name = btrim(native_name) AND native_name <> ''");
            });
            e.HasKey(x => x.Id).HasName("languages_pkey");
            // Reserve the low IDs for built-in language seeds; custom entries start at 100.
            e.Property(x => x.Id).UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 100);
            e.Property(x => x.Code).HasMaxLength(35);
            e.Property(x => x.NativeName).HasMaxLength(100);
            e.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ix_languages_code");
            e.HasData(
                new { Id = 1L, Code = "en", NativeName = "English" },
                new { Id = 2L, Code = "uk", NativeName = "Українська" },
                new { Id = 3L, Code = "nb", NativeName = "Norsk bokmål" },
                new { Id = 4L, Code = "de", NativeName = "Deutsch" },
                new { Id = 5L, Code = "pl", NativeName = "Polski" });
        });
        model.Entity<ExerciseTranslation>(e =>
        {
            e.ToTable("exercise_translations", t => t.HasCheckConstraint("exercise_translation_title_check", "title = btrim(title) AND title <> ''"));
            e.HasKey(x => new { x.ExerciseId, x.LanguageId }).HasName("exercise_translations_pkey");
            e.HasOne(x => x.Exercise).WithMany(x => x.Translations).HasForeignKey(x => x.ExerciseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("exercise_translations_exercise_id_fkey");
            e.HasOne(x => x.Language).WithMany(x => x.ExerciseTranslations).HasForeignKey(x => x.LanguageId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("exercise_translations_language_id_fkey");
            e.HasIndex(x => x.LanguageId).HasDatabaseName("ix_exercise_translations_language_id");
        });
        model.Entity<ExerciseMedia>(e =>
        {
            e.ToTable("exercise_media", t => t.HasCheckConstraint("exercise_media_position_check", "position >= 1"));
            e.HasKey(x => x.Id).HasName("exercise_media_pkey");
            e.HasIndex(x => new { x.ExerciseId, x.Position }).IsUnique().HasDatabaseName("ix_exercise_media_exercise_id_position");
            e.HasOne(x => x.Exercise).WithMany(x => x.Media).HasForeignKey(x => x.ExerciseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("exercise_media_exercise_id_fkey");
        });
        model.Entity<ExerciseMediaTranslation>(e =>
        {
            e.ToTable("exercise_media_translations", t => t.HasCheckConstraint("exercise_media_url_check", "url = btrim(url) AND url <> ''"));
            e.HasKey(x => new { x.ExerciseMediaId, x.LanguageId }).HasName("exercise_media_translations_pkey");
            e.Property(x => x.Url).HasMaxLength(2048);
            e.HasOne(x => x.ExerciseMedia).WithMany(x => x.Translations).HasForeignKey(x => x.ExerciseMediaId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("exercise_media_translations_exercise_media_id_fkey");
            e.HasOne(x => x.Language).WithMany(x => x.ExerciseMediaTranslations).HasForeignKey(x => x.LanguageId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("exercise_media_translations_language_id_fkey");
            e.HasIndex(x => x.LanguageId).HasDatabaseName("ix_exercise_media_translations_language_id");
        });
    }
}
