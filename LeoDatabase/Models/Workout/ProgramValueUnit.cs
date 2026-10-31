namespace LeoDatabase.Models.Workout;

public enum ProgramValueUnit
{
    [NpgsqlTypes.PgName("percent_1rm")]
    Percent1Rm,
    Kg,
    Lb,
    Km,
    Mi,
    S
}
