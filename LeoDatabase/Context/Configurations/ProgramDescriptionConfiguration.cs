using LeoDatabase.Models.Workout;
using Microsoft.EntityFrameworkCore;
namespace LeoDatabase.Context.Configurations;
internal static class ProgramDescriptionConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<ProgramDescription>(e =>
        {
            e.ToTable("program_descriptions", t =>
            {
                t.HasCheckConstraint("program_description_length_check", "char_length(description)<=20000");
                t.HasCheckConstraint("program_description_image_check", "image_url IS NULL OR (image_url=btrim(image_url) AND image_url<>'')");
                t.HasCheckConstraint("program_description_alt_check", "char_length(image_alt)<=300");
            });
            e.HasKey(x => new { x.ProgramId, x.LanguageId }).HasName("program_descriptions_pkey");
            e.Property(x => x.Description).HasDefaultValue("");
            e.Property(x => x.ImageUrl).HasMaxLength(2048);
            e.Property(x => x.ImageAlt).HasDefaultValue("");
            e.HasOne(x => x.Program).WithMany(x => x.Descriptions).HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("program_descriptions_program_id_fkey");
            e.HasOne(x => x.Language).WithMany(x => x.ProgramDescriptions).HasForeignKey(x => x.LanguageId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("program_descriptions_language_id_fkey");
            e.HasIndex(x => x.LanguageId).HasDatabaseName("ix_program_descriptions_language_id");
        });
    }
}
