using LeoCore.Models.Program;

namespace LeoCore.Managers;

public sealed partial class ProgramManager
{
    private static void ValidateTargets(SetExerciseDetails details)
    {
        if (details.TargetRepsMin.HasValue != details.TargetRepsMax.HasValue)
            throw new ArgumentException("Minimum and maximum repetitions must be supplied or cleared together.", nameof(details));
        if (details.TargetRepsMin is { } minReps &&
            (minReps < 1 || details.TargetRepsMax < minReps))
            throw new ArgumentException("Repetitions must be positive and maximum must be at least minimum.", nameof(details));

        var hasValues = details.ValueMin.HasValue || details.ValueMax.HasValue || details.ValueUnit.HasValue;
        if (!hasValues) return;
        if (details.ValueMin is not { } min || details.ValueMax is not { } max || details.ValueUnit is not { } unit)
            throw new ArgumentException("Value minimum, maximum and unit must be supplied or cleared together.", nameof(details));
        if (!Enum.IsDefined(unit)) throw new ArgumentOutOfRangeException(nameof(details), "Unknown target unit.");
        if (min < 0 || max < min || max > 999999999.999m || decimal.Round(min, 3) != min || decimal.Round(max, 3) != max)
            throw new ArgumentException("Target values must be ordered, nonnegative, at most 999999999.999 and have at most three decimal places.", nameof(details));
    }
}
